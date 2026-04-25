import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { WorkbookRegistry } from '../workbook/registry.js';
import type { ACLChecker } from '../auth/acl.js';
import { createScopeCheckMiddleware } from '../auth/middleware.js';
import { readRecords, readRecord, addRecord, updateRecord, deleteRecord } from '../excel/operations.js';
import { getFileLock } from '../lock/lockfile.js';
import { getCache } from '../cache/mtimeCache.js';
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

        const offset = request.query.offset ?? 0;
        const limit = Math.min(request.query.limit ?? 100, 1000);
        const format = request.query.format ?? 'native';

        try {
          const records = await readRecords(workbook.path, request.params.sheetName, 1, offset, limit, format);
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
          const record = await readRecord(workbook.path, request.params.sheetName, request.params.recordIndex, 1, format);
          metrics.observeHistogram('excel_api_record_get_duration_ms', Date.now() - startTime);
          return record;
        } catch (error) {
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

        const fileLock = getFileLock();
        try {
          await fileLock.acquire(request.params.id);
        } catch (error) {
          metrics.incrementCounter('excel_api_errors_total', 1, { error: 'FILE_LOCKED' });
          return reply.status(409).send({
            error: 'FILE_LOCKED',
            message: error instanceof Error ? error.message : 'File is locked',
          });
        }

        try {
          const record = await addRecord(
            workbook.path,
            request.params.sheetName,
            request.body.data,
            request.body.after_row,
            request.body.copy_style_from
          );
          const cache = getCache();
          cache.invalidate(workbook.path);
          metrics.observeHistogram('excel_api_record_add_duration_ms', Date.now() - startTime);
          reply.status(201).send(record);
        } catch (error) {
          metrics.incrementCounter('excel_api_errors_total', 1, { error: 'INTERNAL_ERROR' });
          throw error;
        } finally {
          fileLock.release(request.params.id);
        }
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

        const fileLock = getFileLock();
        try {
          await fileLock.acquire(request.params.id);
        } catch (error) {
          metrics.incrementCounter('excel_api_errors_total', 1, { error: 'FILE_LOCKED' });
          return reply.status(409).send({
            error: 'FILE_LOCKED',
            message: error instanceof Error ? error.message : 'File is locked',
          });
        }

        try {
          const record = await updateRecord(
            workbook.path,
            request.params.sheetName,
            request.params.recordIndex,
            request.body.data
          );
          const cache = getCache();
          cache.invalidate(workbook.path);
          metrics.observeHistogram('excel_api_record_update_duration_ms', Date.now() - startTime);
          return record;
        } catch (error) {
          metrics.incrementCounter('excel_api_errors_total', 1, { error: 'INTERNAL_ERROR' });
          throw error;
        } finally {
          fileLock.release(request.params.id);
        }
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

        const fileLock = getFileLock();
        try {
          await fileLock.acquire(request.params.id);
        } catch (error) {
          metrics.incrementCounter('excel_api_errors_total', 1, { error: 'FILE_LOCKED' });
          return reply.status(409).send({
            error: 'FILE_LOCKED',
            message: error instanceof Error ? error.message : 'File is locked',
          });
        }

        try {
          await deleteRecord(workbook.path, request.params.sheetName, request.params.recordIndex);
          const cache = getCache();
          cache.invalidate(workbook.path);
          metrics.observeHistogram('excel_api_record_delete_duration_ms', Date.now() - startTime);
          reply.status(204).send();
        } catch (error) {
          metrics.incrementCounter('excel_api_errors_total', 1, { error: 'INTERNAL_ERROR' });
          throw error;
        } finally {
          fileLock.release(request.params.id);
        }
      }
    );
  };
}
