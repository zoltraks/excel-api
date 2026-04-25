import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { WorkbookRegistry } from '../workbook/registry.js';
import type { ACLChecker } from '../auth/acl.js';
import { createScopeCheckMiddleware } from '../auth/middleware.js';
import { readSheetNames, getSheetMetadata, getColumnDefinitions } from '../excel/operations.js';
import { metrics } from '../metrics/collector.js';

type AuthMiddleware = (request: FastifyRequest, reply: FastifyReply) => Promise<void>;

export function sheetRoutes(
  registry: WorkbookRegistry,
  authMiddleware: AuthMiddleware,
  aclChecker: ACLChecker
) {
  return async function (server: FastifyInstance): Promise<void> {
    server.get<{ Params: { id: string; sheetName: string } }>(
      '/workbooks/:id/sheets/:sheetName',
      { preHandler: [authMiddleware, createScopeCheckMiddleware(aclChecker, 'read', false)] },
      async (request, reply) => {
        metrics.incrementCounter('excel_api_sheet_get_requests_total');
        const startTime = Date.now();

        const workbook = registry.get(request.params.id);
        if (!workbook) {
          metrics.incrementCounter('excel_api_errors_total', 1, { error: 'WORKBOOK_NOT_FOUND' });
          return reply.status(404).send({
            error: 'WORKBOOK_NOT_FOUND',
            message: `Workbook with ID '${request.params.id}' not found`,
          });
        }

        const sheets = await readSheetNames(workbook.path);
        const sheet = sheets.find((s) => s.name === request.params.sheetName);
        if (!sheet) {
          metrics.incrementCounter('excel_api_errors_total', 1, { error: 'SHEET_NOT_FOUND' });
          return reply.status(404).send({
            error: 'SHEET_NOT_FOUND',
            message: `Sheet '${request.params.sheetName}' not found in workbook`,
          });
        }

        metrics.observeHistogram('excel_api_sheet_get_duration_ms', Date.now() - startTime);
        const metadata = await getSheetMetadata(workbook.path, sheet.name);
        return metadata;
      }
    );

    server.get<{ Params: { id: string; sheetName: string } }>(
      '/workbooks/:id/sheets/:sheetName/columns',
      { preHandler: [authMiddleware, createScopeCheckMiddleware(aclChecker, 'read', false)] },
      async (request, reply) => {
        metrics.incrementCounter('excel_api_columns_get_requests_total');
        const startTime = Date.now();

        const workbook = registry.get(request.params.id);
        if (!workbook) {
          metrics.incrementCounter('excel_api_errors_total', 1, { error: 'WORKBOOK_NOT_FOUND' });
          return reply.status(404).send({
            error: 'WORKBOOK_NOT_FOUND',
            message: `Workbook with ID '${request.params.id}' not found`,
          });
        }

        try {
          const columns = await getColumnDefinitions(workbook.path, request.params.sheetName);
          metrics.observeHistogram('excel_api_columns_get_duration_ms', Date.now() - startTime);
          return columns;
        } catch (error) {
          if (error instanceof Error && error.message.includes('not found')) {
            metrics.incrementCounter('excel_api_errors_total', 1, { error: 'SHEET_NOT_FOUND' });
            return reply.status(404).send({
              error: 'SHEET_NOT_FOUND',
              message: error.message,
            });
          }
          metrics.incrementCounter('excel_api_errors_total', 1, { error: 'INTERNAL_ERROR' });
          throw error;
        }
      }
    );
  };
}
