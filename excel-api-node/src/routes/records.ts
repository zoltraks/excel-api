import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { WorkbookRegistry } from '../workbook/registry.js';
import type { ACLChecker } from '../auth/acl.js';
import { createScopeCheckMiddleware } from '../auth/middleware.js';
import { readRecords, readRecord } from '../excel/operations.js';
import { createBatchExecutor } from '../excel/batch.js';
import { getWriteQueue } from '../queue/writeQueue.js';
import { handleEnqueueError, handleFailedResult } from './writeHelpers.js';
import { validate, AddRecordSchema, UpdateRecordSchema } from './validate.js';
import { metrics } from '../metrics/collector.js';

type AuthMiddleware = (request: FastifyRequest, reply: FastifyReply) => Promise<void>;

export function recordRoutes(
  registry: WorkbookRegistry,
  authMiddleware: AuthMiddleware,
  aclChecker: ACLChecker
) {
  return async function (server: FastifyInstance): Promise<void> {
    server.get<{
      Params: { id: string; sheetName: string };
      Querystring: { offset?: number; limit?: number; format?: 'native' | 'display' | 'string' };
    }>(
      '/workbooks/:id/sheets/:sheetName/records',
      { preHandler: [authMiddleware, createScopeCheckMiddleware(aclChecker, 'read', false)] },
      async (request, reply) => {
        metrics.incrementCounter('excel_api_records_list_requests_total');
        const startTime = Date.now();

        const workbook = registry.get(request.params.id);
        if (!workbook) {
          metrics.incrementCounter('excel_api_errors_total', 1, { error: 'WORKBOOK_NOT_FOUND' });
          return reply.status(404).send({
            error: 'WORKBOOK_NOT_FOUND',
            message: `Workbook with ID '${request.params.id}' not found`,
          });
        }

        const offset = Number.parseInt(String(request.query.offset ?? '0'), 10) || 0;
        const limit = Math.min(Number.parseInt(String(request.query.limit ?? '100'), 10) || 100, 1000);
        const format = request.query.format ?? 'native';

        try {
          const records = await readRecords(workbook.path, request.params.sheetName, workbook.sheets?.[request.params.sheetName], offset, limit, format);
          metrics.observeHistogram('excel_api_records_list_duration_ms', Date.now() - startTime);
          return records;
        } catch (error) {
          if (error instanceof Error && error.message.includes('not found')) {
            metrics.incrementCounter('excel_api_errors_total', 1, { error: 'SHEET_NOT_FOUND' });
            return reply.status(404).send({ error: 'SHEET_NOT_FOUND', message: error.message });
          }
          if (error instanceof Error && error.message.includes('not configured')) {
            metrics.incrementCounter('excel_api_errors_total', 1, { error: 'SHEET_NOT_CONFIGURED' });
            return reply.status(400).send({
              error: 'SHEET_NOT_CONFIGURED',
              message: 'Sheet is not configured for tabular access',
            });
          }
          metrics.incrementCounter('excel_api_errors_total', 1, { error: 'INTERNAL_ERROR' });
          throw error;
        }
      }
    );

    server.get<{
      Params: { id: string; sheetName: string; recordIndex: number };
      Querystring: { format?: 'native' | 'display' | 'string' };
    }>(
      '/workbooks/:id/sheets/:sheetName/records/:recordIndex',
      { preHandler: [authMiddleware, createScopeCheckMiddleware(aclChecker, 'read', false)] },
      async (request, reply) => {
        metrics.incrementCounter('excel_api_record_get_requests_total');
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
          const recordIndex = Number.parseInt(String(request.params.recordIndex), 10);
          const record = await readRecord(workbook.path, request.params.sheetName, recordIndex, workbook.sheets?.[request.params.sheetName], format);
          metrics.observeHistogram('excel_api_record_get_duration_ms', Date.now() - startTime);
          return record;
        } catch (error) {
          if (error instanceof Error && error.message.includes('not configured')) {
            metrics.incrementCounter('excel_api_errors_total', 1, { error: 'SHEET_NOT_CONFIGURED' });
            return reply.status(400).send({ error: 'SHEET_NOT_CONFIGURED', message: error.message });
          }
          if (error instanceof Error && error.message.includes('not found')) {
            metrics.incrementCounter('excel_api_errors_total', 1, { error: 'SHEET_NOT_FOUND' });
            return reply.status(404).send({ error: 'SHEET_NOT_FOUND', message: error.message });
          }
          if (error instanceof Error && error.message.includes('out of range')) {
            metrics.incrementCounter('excel_api_errors_total', 1, { error: 'ROW_NOT_FOUND' });
            return reply.status(404).send({ error: 'ROW_NOT_FOUND', message: error.message });
          }
          metrics.incrementCounter('excel_api_errors_total', 1, { error: 'INTERNAL_ERROR' });
          throw error;
        }
      }
    );

    server.post<{
      Params: { id: string; sheetName: string };
      Body: { data: Record<string, unknown>; after_row?: number; copy_style_from?: number };
    }>(
      '/workbooks/:id/sheets/:sheetName/records',
      { preHandler: [authMiddleware, createScopeCheckMiddleware(aclChecker, 'write', false)] },
      async (request, reply) => {
        metrics.incrementCounter('excel_api_record_add_requests_total');
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

        const body = validate(reply, AddRecordSchema, request.body);
        if (!body) {
          return reply;
        }

        const queue = getWriteQueue();
        let result;
        try {
          result = await queue.enqueue(
            request.params.id,
            {
              type: 'record',
              op: 'add',
              sheetName: request.params.sheetName,
              data: body.data,
              afterRow: body.after_row,
              copyStyleFrom: body.copy_style_from,
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
        metrics.observeHistogram('excel_api_record_add_duration_ms', Date.now() - startTime);
        return reply.status(201).send(result.data);
      }
    );

    server.put<{
      Params: { id: string; sheetName: string; recordIndex: number };
      Body: { data: Record<string, unknown> };
    }>(
      '/workbooks/:id/sheets/:sheetName/records/:recordIndex',
      { preHandler: [authMiddleware, createScopeCheckMiddleware(aclChecker, 'write', false)] },
      async (request, reply) => {
        metrics.incrementCounter('excel_api_record_update_requests_total');
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

        const body = validate(reply, UpdateRecordSchema, request.body);
        if (!body) {
          return reply;
        }

        const queue = getWriteQueue();
        let result;
        try {
          result = await queue.enqueue(
            request.params.id,
            {
              type: 'record',
              op: 'update',
              sheetName: request.params.sheetName,
              recordIndex: Number.parseInt(String(request.params.recordIndex), 10),
              data: body.data,
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
        metrics.observeHistogram('excel_api_record_update_duration_ms', Date.now() - startTime);
        return result.data as object;
      }
    );

    server.delete<{
      Params: { id: string; sheetName: string; recordIndex: number };
    }>(
      '/workbooks/:id/sheets/:sheetName/records/:recordIndex',
      { preHandler: [authMiddleware, createScopeCheckMiddleware(aclChecker, 'write', false)] },
      async (request, reply) => {
        metrics.incrementCounter('excel_api_record_delete_requests_total');
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

        const queue = getWriteQueue();
        let result;
        try {
          result = await queue.enqueue(
            request.params.id,
            {
              type: 'record',
              op: 'delete',
              sheetName: request.params.sheetName,
              recordIndex: Number.parseInt(String(request.params.recordIndex), 10),
              data: null,
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
        metrics.observeHistogram('excel_api_record_delete_duration_ms', Date.now() - startTime);
        return reply.status(204).send();
      }
    );
  };
}
