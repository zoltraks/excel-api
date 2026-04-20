// Excel API Node — HTTP service entry point

import Fastify from 'fastify';

const server = Fastify({ logger: true });

server.get('/health', async () => {
  return {
    status: 'ok',
    implementation: 'excel-api-node',
    version: '0.1.0',
    uptime_seconds: Math.floor(process.uptime()),
  };
});

const start = async (): Promise<void> => {
  const port = Number(process.env.PORT ?? 8443);
  await server.listen({ port, host: '0.0.0.0' });
};

start().catch((err) => {
  console.error(err);
  process.exit(1);
});
