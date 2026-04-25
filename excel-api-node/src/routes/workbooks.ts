import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { WorkbookRegistry, WorkbookInfo } from '../workbook/registry.js';
import type { ACLChecker } from '../auth/acl.js';
import { createScopeCheckMiddleware } from '../auth/middleware.js';
import { readSheetNames } from '../excel/operations.js';
import { metrics } from '../metrics/collector.js';

type AuthMiddleware = (request: FastifyRequest, reply: FastifyReply) => Promise<void>;

export function workbookRoutes(
  registry: WorkbookRegistry,
  authMiddleware: AuthMiddleware,
  aclChecker: ACLChecker
) {
  return async function (server: FastifyInstance): Promise<void> {
    server.get(
      '/workbooks',
      { preHandler: [authMiddleware, createScopeCheckMiddleware(aclChecker, 'read', false)] },
      async () => {
        metrics.incrementCounter('excel_api_workbooks_list_requests_total');
        const startTime = Date.now();

        const workbooks = registry.getAll();
        const response = {
          items: workbooks.map((wb: WorkbookInfo) => ({
            id: wb.id,
            filename: wb.filename,
            readonly: wb.readonly,
            modified_at: wb.modified_at,
            size_bytes: wb.size_bytes,
          })),
          total: workbooks.length,
        };

        metrics.observeHistogram('excel_api_workbooks_list_duration_ms', Date.now() - startTime);
        return response;
      }
    );

    server.get<{ Params: { id: string } }>(
      '/workbooks/:id',
      { preHandler: [authMiddleware, createScopeCheckMiddleware(aclChecker, 'read', false)] },
      async (request, reply) => {
        metrics.incrementCounter('excel_api_workbook_get_requests_total');
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
        metrics.observeHistogram('excel_api_workbook_get_duration_ms', Date.now() - startTime);
        return {
          id: workbook.id,
          filename: workbook.filename,
          readonly: workbook.readonly,
          modified_at: workbook.modified_at,
          size_bytes: workbook.size_bytes,
          sheets: sheets.map((s) => ({ name: s.name, index: s.index + 1 })),
        };
      }
    );
  };
}
