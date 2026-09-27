import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { WorkbookRegistry } from '../workbook/registry.js';
import type { ACLChecker } from '../auth/acl.js';
import { createScopeCheckMiddleware } from '../auth/middleware.js';
import { readCell, readRange } from '../excel/operations.js';
import { createBatchExecutor } from '../excel/batch.js';
import { getWriteQueue } from '../queue/writeQueue.js';
import { handleEnqueueError, handleFailedResult } from './writeHelpers.js';
import { validate, CellWriteSchema } from './validate.js';
import { metrics } from '../metrics/collector.js';

type AuthMiddleware = (request: FastifyRequest, reply: FastifyReply) => Promise<void>;

export function cellRoutes(
  registry: WorkbookRegistry,
  authMiddleware: AuthMiddleware,
  aclChecker: ACLChecker
) {
  return async function (server: FastifyInstance): Promise<void> {
    server.get<{
      Params: { id: string; sheetName: string; cellRef: string };
      Querystring: { format?: 'native' | 'display' | 'string' };
    }>(
      '/workbooks/:id/sheets/:sheetName/cells/:cellRef',
      { preHandler: [authMiddleware, createScopeCheckMiddleware(aclChecker, 'read', false)] },
      async (request, reply) => {
        metrics.incrementCounter('excel_api_cell_get_requests_total');
        const startTime = Date.now();

        const workbook = registry.get(request.params.id);
        if (!workbook) {
          metrics.incrementCounter('excel_api_errors_total', 1, { error: 'WORKBOOK_NOT_FOUND' });
          return reply.status(404).send({
            error: 'WORKBOOK_NOT_FOUND',
            message: `Workbook with ID '${request.params.id}' not found`,
          });
        }

        const format = request.query.format ?? 'native';

        try {
          const cellData = await readCell(
            workbook.path,
            request.params.sheetName,
            request.params.cellRef,
            format
          );
          metrics.observeHistogram('excel_api_cell_get_duration_ms', Date.now() - startTime);
          return cellData;
        } catch (error) {
          if (error instanceof Error && error.message.includes('not found')) {
            metrics.incrementCounter('excel_api_errors_total', 1, { error: 'SHEET_NOT_FOUND' });
            return reply.status(404).send({ error: 'SHEET_NOT_FOUND', message: error.message });
          }
          metrics.incrementCounter('excel_api_errors_total', 1, { error: 'INTERNAL_ERROR' });
          throw error;
        }
      }
    );

    server.put<{
      Params: { id: string; sheetName: string; cellRef: string };
      Body: { value: unknown };
    }>(
      '/workbooks/:id/sheets/:sheetName/cells/:cellRef',
      { preHandler: [authMiddleware, createScopeCheckMiddleware(aclChecker, 'write', false)] },
      async (request, reply) => {
        metrics.incrementCounter('excel_api_cell_write_requests_total');
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

        const body = validate(reply, CellWriteSchema, request.body);
        if (!body) {
          return reply;
        }

        const queue = getWriteQueue();
        let result;
        try {
          result = await queue.enqueue(
            request.params.id,
            {
              type: 'cell',
              op: 'write',
              sheetName: request.params.sheetName,
              cellRef: request.params.cellRef,
              data: body.value,
            },
            createBatchExecutor(request.params.id, workbook.path, workbook.sheets)
          );
        } catch (error) {
          if (handleEnqueueError(reply, error)) {
            return reply;
          }
          metrics.incrementCounter('excel_api_errors_total', 1, { error: 'INTERNAL_ERROR' });
          throw error;
        }

        if (handleFailedResult(reply, result)) {
          return reply;
        }
        metrics.observeHistogram('excel_api_cell_write_duration_ms', Date.now() - startTime);
        return result.data as object;
      }
    );

    server.get<{
      Params: { id: string; sheetName: string; rangeRef: string };
      Querystring: { format?: 'native' | 'display' | 'string' };
    }>(
      '/workbooks/:id/sheets/:sheetName/ranges/:rangeRef',
      { preHandler: [authMiddleware, createScopeCheckMiddleware(aclChecker, 'read', false)] },
      async (request, reply) => {
        metrics.incrementCounter('excel_api_range_get_requests_total');
        const startTime = Date.now();

        const workbook = registry.get(request.params.id);
        if (!workbook) {
          metrics.incrementCounter('excel_api_errors_total', 1, { error: 'WORKBOOK_NOT_FOUND' });
          return reply.status(404).send({
            error: 'WORKBOOK_NOT_FOUND',
            message: `Workbook with ID '${request.params.id}' not found`,
          });
        }

        const format = request.query.format ?? 'native';

        try {
          const rangeData = await readRange(
            workbook.path,
            request.params.sheetName,
            request.params.rangeRef,
            format
          );
          metrics.observeHistogram('excel_api_range_get_duration_ms', Date.now() - startTime);
          return rangeData;
        } catch (error) {
          if (error instanceof Error && error.message.includes('not found')) {
            metrics.incrementCounter('excel_api_errors_total', 1, { error: 'SHEET_NOT_FOUND' });
            return reply.status(404).send({ error: 'SHEET_NOT_FOUND', message: error.message });
          }
          metrics.incrementCounter('excel_api_errors_total', 1, { error: 'INTERNAL_ERROR' });
          throw error;
        }
      }
    );
  };
}
