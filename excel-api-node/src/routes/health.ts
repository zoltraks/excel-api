import type { FastifyInstance } from 'fastify';
import { PACKAGE_VERSION } from '../version.js';

export async function healthRoutes(server: FastifyInstance): Promise<void> {
  server.get('/health', async () => {
    const now = new Date();
    return {
      status: 'ok',
      implementation: 'excel-api-node',
      version: PACKAGE_VERSION,
      uptime_seconds: Math.floor(process.uptime()),
      server_time: now.toISOString(),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    };
  });
}
