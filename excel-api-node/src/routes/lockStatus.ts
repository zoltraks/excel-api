import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { WorkbookRegistry } from '../workbook/registry.js';
import type { ACLChecker } from '../auth/acl.js';
import { createScopeCheckMiddleware } from '../auth/middleware.js';
import { getFileLock } from '../lock/lockfile.js';
import { getWriteQueue } from '../queue/writeQueue.js';
import { metrics } from '../metrics/collector.js';

type AuthMiddleware = (request: FastifyRequest, reply: FastifyReply) => Promise<void>;

export function lockStatusRoutes(
  registry: WorkbookRegistry,
  authMiddleware: AuthMiddleware,
  aclChecker: ACLChecker
) {
  return async function (server: FastifyInstance): Promise<void> {
    server.get<{ Params: { id: string } }>(
      '/workbooks/:id/lock-status',
      { preHandler: [authMiddleware, createScopeCheckMiddleware(aclChecker, 'admin', true)] },
      async (request, reply) => {
        metrics.incrementCounter('excel_api_lock_status_requests_total');
        const startTime = Date.now();

        const workbook = registry.get(request.params.id);
        if (!workbook) {
          metrics.incrementCounter('excel_api_errors_total', 1, { error: 'WORKBOOK_NOT_FOUND' });
          return reply.status(404).send({
            error: 'WORKBOOK_NOT_FOUND',
            message: `Workbook with ID '${request.params.id}' not found`,
          });
        }

        const fileLock = getFileLock();
        const lockInfo = fileLock.getLockInfo(request.params.id);
        const lockStatus = { ...lockInfo, queue_depth: getWriteQueue().getDepth(request.params.id) };

        metrics.observeHistogram('excel_api_lock_status_duration_ms', Date.now() - startTime);
        return lockStatus;
      }
    );
  };
}
