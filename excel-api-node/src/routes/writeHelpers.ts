// Shared helpers for write routes: map queue/batch results to HTTP errors

import type { FastifyReply } from 'fastify';
import type { BatchResult } from '../queue/writeQueue.js';
import { QueueFullError } from '../queue/writeQueue.js';
import { BatchLockError } from '../excel/batch.js';
import { metrics } from '../metrics/collector.js';

const CODE_TO_STATUS: Record<string, number> = {
  FILE_LOCKED: 409,
  SERVICE_BUSY: 503,
  SHEET_NOT_FOUND: 404,
  ROW_NOT_FOUND: 404,
  WORKBOOK_NOT_FOUND: 404,
  VALIDATION_ERROR: 400,
};

function sendError(reply: FastifyReply, code: string, message: string): FastifyReply {
  metrics.incrementCounter('excel_api_errors_total', 1, { error: code });
  return reply.status(CODE_TO_STATUS[code] ?? 500).send({ error: code, message });
}

// Maps an enqueue-level rejection (queue full, lock timeout) to a response.
// Returns true when the error was handled.
export function handleEnqueueError(reply: FastifyReply, error: unknown): boolean {
  if (error instanceof QueueFullError) {
    sendError(reply, 'SERVICE_BUSY', error.message);
    return true;
  }
  if (error instanceof BatchLockError) {
    sendError(reply, 'FILE_LOCKED', error.message);
    return true;
  }
  return false;
}

// Maps a failed per-operation result to a response.
// Returns true when the failure was handled (result.success === false).
export function handleFailedResult(reply: FastifyReply, result: BatchResult): boolean {
  if (result.success) {
    return false;
  }
  sendError(reply, result.code ?? 'INTERNAL_ERROR', result.error ?? 'Operation failed');
  return true;
}
