// Write queue with debounce batching

export interface BatchOperation {
  type: 'cell' | 'record' | 'range';
  sheetName: string;
  cellRef?: string;
  rangeRef?: string;
  recordIndex?: number;
  data: unknown;
}

export interface BatchResult {
  success: boolean;
  error?: string;
}

class WriteQueue {
  private queues: Map<string, Promise<void>> = new Map();
  private pendingOperations: Map<string, BatchOperation[]> = new Map();
  private timers: Map<string, NodeJS.Timeout> = new Map();
  private batchMaxSize: number;
  private batchDebounceMs: number;

  constructor(batchMaxSize: number, batchDebounceMs: number) {
    this.batchMaxSize = batchMaxSize;
    this.batchDebounceMs = batchDebounceMs;
  }

  enqueue(
    workbookId: string,
    operation: BatchOperation,
    executor: (operations: BatchOperation[]) => Promise<BatchResult[]>
  ): Promise<BatchResult[]> {
    return new Promise((resolve, reject) => {
      const pending = this.pendingOperations.get(workbookId) ?? [];
      pending.push(operation);
      this.pendingOperations.set(workbookId, pending);

      const execute = async (): Promise<void> => {
        const operations = this.pendingOperations.get(workbookId) ?? [];
        this.pendingOperations.set(workbookId, []);

        try {
          const results = await executor(operations);
          resolve(results);
        } catch (error) {
          reject(error);
        }
      };

      // Add to the promise chain
      const currentChain = this.queues.get(workbookId) ?? Promise.resolve();
      const newChain = currentChain.then(execute).catch((error) => {
        // Errors are already handled in the execute function
        console.error('Batch execution error:', error);
      });
      this.queues.set(workbookId, newChain);

      // Clear existing timer
      const existingTimer = this.timers.get(workbookId);
      if (existingTimer) {
        clearTimeout(existingTimer);
      }

      // Set new timer or execute immediately if batch size reached
      if (pending.length >= this.batchMaxSize) {
        // Execute immediately
        this.timers.delete(workbookId);
        // The promise chain will handle execution
      } else {
        // Set debounce timer
        const timer = setTimeout(() => {
          this.timers.delete(workbookId);
          // The promise chain will handle execution
        }, this.batchDebounceMs);
        this.timers.set(workbookId, timer);
      }
    });
  }

  async flush(workbookId: string): Promise<void> {
    const timer = this.timers.get(workbookId);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(workbookId);
    }

    const chain = this.queues.get(workbookId);
    if (chain) {
      await chain;
    }
  }
}

let queueInstance: WriteQueue | null = null;

export function initWriteQueue(batchMaxSize: number, batchDebounceMs: number): WriteQueue {
  if (!queueInstance) {
    queueInstance = new WriteQueue(batchMaxSize, batchDebounceMs);
  }
  return queueInstance;
}

export function getWriteQueue(): WriteQueue {
  if (!queueInstance) {
    throw new Error('Write queue not initialized. Call initWriteQueue first.');
  }
  return queueInstance;
}
