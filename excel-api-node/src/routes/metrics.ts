import type { FastifyInstance, FastifyReply } from 'fastify';
import { metrics } from '../metrics/collector.js';

export async function metricsRoutes(server: FastifyInstance): Promise<void> {
  server.get('/metrics', async (_request, reply: FastifyReply) => {
    reply.type('text/plain');
    return metrics.toOpenMetrics();
  });
}
