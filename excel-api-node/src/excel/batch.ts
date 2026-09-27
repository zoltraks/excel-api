// Batch operation executor — applies queued operations in a single
// lock acquisition and a single workbook open/save cycle

import ExcelJS from 'exceljs';
import type { BatchExecutor, BatchOperation, BatchResult } from '../queue/writeQueue.js';
import { getFileLock } from '../lock/lockfile.js';
import { getCache } from '../cache/mtimeCache.js';
import {
  applyAddRecord,
  applyClearCell,
  applyDeleteRecord,
  applyUpdateRecord,
  applyWriteCell,
} from './operations.js';
import { resolveSheetLayout, resolveColumnIds, type SheetLayout } from './layout.js';
import type { SheetHeaderConfig } from '../config/types.js';

export class BatchLockError extends Error {
  readonly code = 'FILE_LOCKED';

  constructor(message: string) {
    super(message);
    this.name = 'BatchLockError';
  }
}

function errorCode(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes('not found')) {
    return 'SHEET_NOT_FOUND';
  }
  if (message.includes('out of range')) {
    return 'ROW_NOT_FOUND';
  }
  if (message.includes('Invalid')) {
    return 'VALIDATION_ERROR';
  }
  return 'INTERNAL_ERROR';
}

function applyOperation(
  workbook: ExcelJS.Workbook,
  operation: BatchOperation,
  sheetsConfig: Record<string, SheetHeaderConfig> | undefined,
  layoutCache: Map<string, { layout: SheetLayout; columnIds: string[] }>
): unknown {
  const sheet = workbook.getWorksheet(operation.sheetName);
  if (!sheet) {
    throw new Error(`Sheet '${operation.sheetName}' not found`);
  }

  const verb = operation.op ?? (operation.type === 'record' ? 'update' : 'write');
  let resolved = layoutCache.get(operation.sheetName);
  if (!resolved) {
    const layout = resolveSheetLayout(sheetsConfig?.[operation.sheetName]);
    resolved = { layout, columnIds: resolveColumnIds(workbook, sheet, layout) };
    layoutCache.set(operation.sheetName, resolved);
  }
  const { layout, columnIds } = resolved;

  switch (operation.type) {
    case 'cell':
      if (verb === 'clear') {
        return applyClearCell(sheet, operation.cellRef ?? '');
      }
      return applyWriteCell(sheet, operation.cellRef ?? '', operation.data);
    case 'record':
      if (verb === 'add') {
        return applyAddRecord(
          sheet,
          (operation.data as Record<string, unknown>) ?? {},
          layout,
          columnIds,
          operation.afterRow,
          operation.copyStyleFrom
        );
      }
      if (verb === 'delete') {
        applyDeleteRecord(sheet, operation.recordIndex ?? 0, layout);
        return null;
      }
      return applyUpdateRecord(
        sheet,
        operation.recordIndex ?? 0,
        (operation.data as Record<string, unknown>) ?? {},
        layout,
        columnIds
      );
    default:
      throw new Error(`Unsupported operation type '${operation.type}'`);
  }
}

export function createBatchExecutor(
  fileId: string,
  filePath: string,
  sheetsConfig?: Record<string, SheetHeaderConfig>
): BatchExecutor {
  return async (operations: BatchOperation[]): Promise<BatchResult[]> => {
    const fileLock = getFileLock();

    try {
      await fileLock.acquire(fileId);
    } catch (error) {
      throw new BatchLockError(error instanceof Error ? error.message : 'File is locked');
    }

    const workbook = new ExcelJS.Workbook();
    try {
      await workbook.xlsx.readFile(filePath);

      const layoutCache = new Map<string, { layout: SheetLayout; columnIds: string[] }>();
      const results: BatchResult[] = operations.map(operation => {
        try {
          const data = applyOperation(workbook, operation, sheetsConfig, layoutCache);
          return { success: true, data };
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : String(error),
            code: errorCode(error),
          };
        }
      });

      if (results.some(result => result.success)) {
        await workbook.xlsx.writeFile(filePath);
        getCache().invalidate(filePath);
      }

      return results;
    } finally {
      fileLock.release(fileId);
    }
  };
}
