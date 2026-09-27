import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { WorkbookRegistry } from '../workbook/registry.js';
import type { ACLChecker } from '../auth/acl.js';
import { createScopeCheckMiddleware } from '../auth/middleware.js';
import { createBatchExecutor } from '../excel/batch.js';
import { getWriteQueue, type BatchOperation, type BatchResult } from '../queue/writeQueue.js';
import { handleEnqueueError } from './writeHelpers.js';
import { validate, RecordBatchSchema, CellBatchSchema } from './validate.js';
import { metrics } from '../metrics/collector.js';

type AuthMiddleware = (request: FastifyRequest, reply: FastifyReply) => Promise<void>;

interface RecordOperationRequest {
  op: 'add' | 'update' | 'delete';
  row_index?: number;
  data?: Record<string, unknown>;
  copy_style_from?: number;
}

interface CellOperationRequest {
  op: 'update' | 'clear';
  ref: string;
  value?: unknown;
}

function toContractResult(operation: BatchOperation, result: BatchResult, index?: number) {
  return {
    op: operation.op ?? operation.type,
    status: result.success ? 'ok' : 'error',
    ...(index !== undefined && { index }),
    ...(!result.success && result.error !== undefined && { error: result.error }),
  };
}

export function operationRoutes(
  registry: WorkbookRegistry,
  authMiddleware: AuthMiddleware,
  aclChecker: ACLChecker
) {
  return async function (server: FastifyInstance): Promise<void> {
    server.post<{
      Params: { id: string; sheetName: string };
      Body: { operations?: RecordOperationRequest[] };
    }>(
      '/workbooks/:id/sheets/:sheetName/operations',
      { preHandler: [authMiddleware, createScopeCheckMiddleware(aclChecker, 'write', false)] },
      async (request, reply) => {
        metrics.incrementCounter('excel_api_batch_record_requests_total');
        const startTime = Date.now();

        const workbook = registry.get(request.params.id);
        if (!workbook) {
          metrics.incrementCounter('excel_api_errors_total', 1, { error: 'WORKBOOK_NOT_FOUND' });
          return reply.status(404).send({
            error: 'WORKBOOK_NOT_FOUND',
            message: `Workbook with ID '${request.params.id}' not found`,
          });
        }

        if (workbook.readonly) {
          metrics.incrementCounter('excel_api_errors_total', 1, { error: 'READONLY_WORKBOOK' });
          return reply.status(422).send({ error: 'READONLY_WORKBOOK', message: 'Workbook is readonly' });
        }

        const body = validate(reply, RecordBatchSchema, request.body);
        if (!body) {
          return reply;
        }
        const requestOps = body.operations;

        const operations: BatchOperation[] = requestOps.map(requestOp => ({
          type: 'record',
          op: requestOp.op,
          sheetName: request.params.sheetName,
          recordIndex: requestOp.row_index,
          afterRow: requestOp.op === 'add' ? requestOp.row_index : undefined,
          copyStyleFrom: requestOp.copy_style_from,
          data: requestOp.data ?? null,
        }));

        let results: BatchResult[];
        try {
          results = await getWriteQueue().enqueueBatch(
            request.params.id,
            operations,
            createBatchExecutor(request.params.id, workbook.path, workbook.sheets)
          );
        } catch (error) {
          if (handleEnqueueError(reply, error)) {
            return reply;
          }
          metrics.incrementCounter('excel_api_errors_total', 1, { error: 'INTERNAL_ERROR' });
          throw error;
        }

        metrics.observeHistogram('excel_api_batch_record_duration_ms', Date.now() - startTime);
        return {
          results: results.map((result, i) =>
            toContractResult(
              operations[i],
              result,
              result.success && result.data && typeof result.data === 'object'
                ? (result.data as { index?: number }).index
                : operations[i].recordIndex
            )
          ),
          applied_at: new Date().toISOString(),
        };
      }
    );

    server.post<{
      Params: { id: string; sheetName: string };
      Body: { operations?: CellOperationRequest[] };
    }>(
      '/workbooks/:id/sheets/:sheetName/cells/operations',
      { preHandler: [authMiddleware, createScopeCheckMiddleware(aclChecker, 'write', false)] },
      async (request, reply) => {
        metrics.incrementCounter('excel_api_batch_cell_requests_total');
        const startTime = Date.now();

        const workbook = registry.get(request.params.id);
        if (!workbook) {
          metrics.incrementCounter('excel_api_errors_total', 1, { error: 'WORKBOOK_NOT_FOUND' });
          return reply.status(404).send({
            error: 'WORKBOOK_NOT_FOUND',
            message: `Workbook with ID '${request.params.id}' not found`,
          });
        }

        if (workbook.readonly) {
          metrics.incrementCounter('excel_api_errors_total', 1, { error: 'READONLY_WORKBOOK' });
          return reply.status(422).send({ error: 'READONLY_WORKBOOK', message: 'Workbook is readonly' });
        }

        const body = validate(reply, CellBatchSchema, request.body);
        if (!body) {
          return reply;
        }
        const requestOps = body.operations;

        const operations: BatchOperation[] = requestOps.map(requestOp => ({
          type: 'cell',
          op: requestOp.op,
          sheetName: request.params.sheetName,
          cellRef: requestOp.ref,
          data: requestOp.value ?? null,
        }));

        let results: BatchResult[];
        try {
          results = await getWriteQueue().enqueueBatch(
            request.params.id,
            operations,
            createBatchExecutor(request.params.id, workbook.path, workbook.sheets)
          );
        } catch (error) {
          if (handleEnqueueError(reply, error)) {
            return reply;
          }
          metrics.incrementCounter('excel_api_errors_total', 1, { error: 'INTERNAL_ERROR' });
          throw error;
        }

        metrics.observeHistogram('excel_api_batch_cell_duration_ms', Date.now() - startTime);
        return {
          results: results.map((result, i) => toContractResult(operations[i], result)),
          applied_at: new Date().toISOString(),
        };
      }
    );
  };
}
