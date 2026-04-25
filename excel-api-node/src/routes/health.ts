import type { FastifyInstance } from 'fastify';

export async function healthRoutes(server: FastifyInstance): Promise<void> {
  server.get('/health', async () => {
    const now = new Date();
    return {
      status: 'ok',
      implementation: 'excel-api-node',
      version: '0.0.2',
      uptime_seconds: Math.floor(process.uptime()),
      server_time: now.toISOString(),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    };
  });
}
