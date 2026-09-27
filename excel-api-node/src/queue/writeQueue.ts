// Write queue with debounce batching

export interface BatchOperation {
  type: 'cell' | 'record' | 'range';
  op?: 'add' | 'update' | 'delete' | 'write' | 'clear' | undefined;
  sheetName: string;
  cellRef?: string | undefined;
  rangeRef?: string | undefined;
  recordIndex?: number | undefined;
  afterRow?: number | undefined;
  copyStyleFrom?: number | undefined;
  data: unknown;
}

export interface BatchResult {
  success: boolean;
  data?: unknown;
  error?: string | undefined;
  code?: string | undefined;
}

export type BatchExecutor = (operations: BatchOperation[]) => Promise<BatchResult[]>;

export class QueueFullError extends Error {
  readonly code = 'SERVICE_BUSY';

  constructor(workbookId: string) {
    super(`Write queue capacity reached for workbook '${workbookId}'`);
    this.name = 'QueueFullError';
  }
}

interface PendingOperation {
  operation: BatchOperation;
  resolve: (result: BatchResult) => void;
  reject: (error: Error) => void;
}

class WriteQueue {
  private pendingOperations: Map<string, PendingOperation[]> = new Map();
  private chains: Map<string, Promise<void>> = new Map();
  private timers: Map<string, NodeJS.Timeout> = new Map();
  private executors: Map<string, BatchExecutor> = new Map();
  private running: Map<string, number> = new Map();
  private batchMaxSize: number;
  private batchDebounceMs: number;

  constructor(batchMaxSize: number, batchDebounceMs: number) {
    this.batchMaxSize = batchMaxSize;
    this.batchDebounceMs = batchDebounceMs;
  }

  configure(batchMaxSize: number, batchDebounceMs: number): void {
    this.batchMaxSize = batchMaxSize;
    this.batchDebounceMs = batchDebounceMs;
  }

  enqueue(
    workbookId: string,
    operation: BatchOperation,
    executor: BatchExecutor
  ): Promise<BatchResult> {
    const pending = this.pendingOperations.get(workbookId) ?? [];
    if (pending.length >= this.batchMaxSize) {
      return Promise.reject(new QueueFullError(workbookId));
    }
    this.executors.set(workbookId, executor);

    return new Promise((resolve, reject) => {
      pending.push({ operation, resolve, reject });
      this.pendingOperations.set(workbookId, pending);

      if (pending.length >= this.batchMaxSize) {
        this.scheduleDrain(workbookId, 0);
      } else {
        this.scheduleDrain(workbookId, this.batchDebounceMs);
      }
    });
  }

  async enqueueBatch(
    workbookId: string,
    operations: BatchOperation[],
    executor: BatchExecutor
  ): Promise<BatchResult[]> {
    const pending = this.pendingOperations.get(workbookId) ?? [];
    if (pending.length + operations.length > this.batchMaxSize) {
      throw new QueueFullError(workbookId);
    }
    const results = operations.map(operation =>
      this.enqueue(workbookId, operation, executor)
    );
    this.scheduleDrain(workbookId, 0);
    return Promise.all(results);
  }

  getDepth(workbookId: string): number {
    const pending = this.pendingOperations.get(workbookId)?.length ?? 0;
    const active = this.running.get(workbookId) ?? 0;
    return pending + active;
  }

  async flush(workbookId: string): Promise<void> {
    this.drain(workbookId);
    const chain = this.chains.get(workbookId);
    if (chain) {
      await chain;
    }
  }

  private scheduleDrain(workbookId: string, delayMs: number): void {
    const existingTimer = this.timers.get(workbookId);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }
    this.timers.set(
      workbookId,
      setTimeout(() => this.drain(workbookId), delayMs)
    );
  }

  private drain(workbookId: string): void {
    const timer = this.timers.get(workbookId);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(workbookId);
    }

    const batch = this.pendingOperations.get(workbookId) ?? [];
    if (batch.length === 0) {
      return;
    }
    this.pendingOperations.set(workbookId, []);

    const executor = this.executors.get(workbookId);
    const previousChain = this.chains.get(workbookId) ?? Promise.resolve();
    const run = previousChain.then(async (): Promise<void> => {
      this.running.set(workbookId, (this.running.get(workbookId) ?? 0) + batch.length);
      try {
        const results = executor
          ? await executor(batch.map(pending => pending.operation))
          : batch.map((): BatchResult => ({ success: false, error: 'No executor registered' }));
        batch.forEach((pending, index) => {
          pending.resolve(results[index] ?? { success: false, error: 'No result produced' });
        });
      } catch (error) {
        batch.forEach(pending => pending.reject(error as Error));
      } finally {
        this.running.set(workbookId, (this.running.get(workbookId) ?? 0) - batch.length);
      }
    });
    this.chains.set(workbookId, run);
  }
}

let queueInstance: WriteQueue | null = null;

export function initWriteQueue(batchMaxSize: number, batchDebounceMs: number): WriteQueue {
  if (!queueInstance) {
    queueInstance = new WriteQueue(batchMaxSize, batchDebounceMs);
  } else {
    queueInstance.configure(batchMaxSize, batchDebounceMs);
  }
  return queueInstance;
}

export function getWriteQueue(): WriteQueue {
  if (!queueInstance) {
    throw new Error('Write queue not initialized. Call initWriteQueue first.');
  }
  return queueInstance;
}
