import type { FastifyInstance } from 'fastify';
import { PACKAGE_VERSION } from '../version.js';
import { formatLocalTime } from '../util/datetime.js';

export async function healthRoutes(server: FastifyInstance): Promise<void> {
  server.get('/health', async () => {
    const now = new Date();
    return {
      status: 'ok',
      implementation: 'excel-api-node',
      version: PACKAGE_VERSION,
      uptime: Math.floor(process.uptime()),
      time: formatLocalTime(now),
      zone: process.env.TZ || Intl.DateTimeFormat().resolvedOptions().timeZone,
    };
  });
}
