import type { FastifyInstance } from 'fastify';
import { PACKAGE_VERSION } from '../version.js';

export async function healthRoutes(server: FastifyInstance): Promise<void> {
  server.get('/health', async () => {
    const now = new Date();
    const p2 = (n: number, w = 2): string => String(n).padStart(w, '0');
    return {
      status: 'ok',
      implementation: 'excel-api-node',
      version: PACKAGE_VERSION,
      uptime: Math.floor(process.uptime()),
      time: `${now.getFullYear()}-${p2(now.getMonth() + 1)}-${p2(now.getDate())} ${p2(now.getHours())}:${p2(now.getMinutes())}:${p2(now.getSeconds())}.${p2(now.getMilliseconds(), 3)}`,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    };
  });
}
