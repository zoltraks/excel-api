// Excel API Node  HTTP service entry point

import Fastify, { type FastifyInstance } from 'fastify';
import * as fs from 'fs';
import { loadConfig, loadAccessConfig } from './config/loader.js';
import { initRegistry, getRegistry } from './workbook/registry.js';
import { JWTAuth, OAuth2Handler, StaticTokenAuth } from './auth/jwt.js';
import { ACLChecker } from './auth/acl.js';
import { createAuthMiddleware } from './auth/middleware.js';
import { initFileLock } from './lock/lockfile.js';
import { initWriteQueue } from './queue/writeQueue.js';
import { initCache } from './cache/mtimeCache.js';
import cors from '@fastify/cors';
import { initLogger, getLogger, LogLevel } from './logger/index.js';
import { createFileLogger, buildRequestLogRecord } from './logger/rotatingFileLogger.js';
import { parseDuration } from './util/duration.js';
import { parseArgs } from './cli/args.js';
import { healthRoutes } from './routes/health.js';
import { metricsRoutes } from './routes/metrics.js';
import { metrics } from './metrics/collector.js';
import { openapiRoutes } from './routes/openapi.js';
import { authRoutes } from './routes/auth.js';
import { RateLimiter } from './ratelimit/limiter.js';
import { workbookRoutes } from './routes/workbooks.js';
import { sheetRoutes } from './routes/sheets.js';
import { cellRoutes } from './routes/cells.js';
import { recordRoutes } from './routes/records.js';
import { operationRoutes } from './routes/operations.js';
import { lockStatusRoutes } from './routes/lockStatus.js';

const args = parseArgs();

const config = loadConfig({
  ...(args.workDir && { workDir: args.workDir }),
  ...(args.configPath && { configPath: args.configPath }),
  ...(args.life && { cliLife: args.life }),
});

const logLevelMap: Record<string, LogLevel> = {
  error: LogLevel.ERROR,
  warn: LogLevel.WARN,
  info: LogLevel.INFO,
  debug: LogLevel.DEBUG,
};
initLogger(logLevelMap[config.logging.level] || LogLevel.INFO);
const logger = getLogger();

initRegistry(config);
const registry = getRegistry();

const accessConfig = loadAccessConfig({
  ...(args.workDir && { workDir: args.workDir }),
  ...(args.accessPath && { accessPath: args.accessPath }),
  logger: {
    warn: (message: string, additional?: Record<string, unknown>) => logger.warn(message, additional),
  },
});
const jwtAuth = new JWTAuth(
  accessConfig.jwt.secret,
  config.auth.jwt.issuer,
  config.auth.jwt.expiration_minutes
);
const oauth2Handler = new OAuth2Handler(accessConfig, jwtAuth);
const staticTokenAuth = new StaticTokenAuth(accessConfig);
const aclChecker = new ACLChecker(accessConfig);
const authMiddleware = createAuthMiddleware(jwtAuth, staticTokenAuth);

initFileLock(config.queue.lock_dir, config.queue.lock_timeout_ms, 'excel-api-node');
initWriteQueue(config.queue.batch_max_size, config.queue.batch_debounce_ms);
initCache(config.cache.enabled, config.cache.poll_interval_ms);

const fileLogger = createFileLogger(config.logging.file);

let httpsOptions: { cert: string; key: string } | null = null;
if (config.server.tls.enabled) {
  if (!config.server.tls.cert_file || !config.server.tls.key_file) {
    logger.error('TLS is enabled but server.tls.cert_file and/or server.tls.key_file are not configured');
    process.exit(1);
  }
  httpsOptions = {
    cert: fs.readFileSync(config.server.tls.cert_file, 'utf8'),
    key: fs.readFileSync(config.server.tls.key_file, 'utf8'),
  };
}

const server = (
  httpsOptions
    ? Fastify({ logger: false, https: httpsOptions })
    : Fastify({ logger: false })
) as FastifyInstance;

server.addHook('onSend', (_request, reply, payload, done) => {
  reply.header('X-Content-Type-Options', 'nosniff');
  reply.header('X-Frame-Options', 'DENY');
  reply.header('Referrer-Policy', 'no-referrer');
  done(null, payload);
});

server.addHook('onResponse', (request, reply, done) => {
  metrics.incrementCounter('excel_api_http_requests_total', 1, {
    method: request.method,
    status: String(reply.statusCode),
  });
  metrics.observeHistogram('excel_api_http_request_duration_ms', reply.elapsedTime, {
    method: request.method,
    status: String(reply.statusCode),
  });

  const logData = buildRequestLogRecord(request, reply);
  logger.info('Request completed', logData);
  if (fileLogger) { fileLogger.log(logData); }
  done();
});

server.addContentTypeParser('application/x-www-form-urlencoded', (_request, payload, done) => {
  let body = '';
  payload.on('data', (chunk: Buffer) => { body += chunk.toString(); });
  payload.on('end', () => {
    try {
      const params = new URLSearchParams(body);
      const parsed: Record<string, string> = {};
      params.forEach((value, key) => { parsed[key] = value; });
      done(null, parsed);
    } catch (err) { done(err as Error); }
  });
});

const rateLimitConfig = config.rate_limit;
if (rateLimitConfig.enabled) {
  const tokenLimiter = new RateLimiter(rateLimitConfig.token_per_minute, 60_000);
  const globalLimiter = new RateLimiter(rateLimitConfig.requests_per_minute, 60_000);
  server.addHook('onRequest', async (request, reply) => {
    const ip = request.ip;
    const isTokenRequest = request.method === 'POST' && request.url.endsWith('/auth/token');
    const tokenAllowed = isTokenRequest ? tokenLimiter.hit(ip) : true;
    if (!tokenAllowed || !globalLimiter.hit(ip)) {
      return reply.status(429).send({ error: 'RATE_LIMITED', message: 'Rate limit exceeded' });
    }
  });
}

const corsOrigins = config.server.cors?.allowed_origins ?? [];
await server.register(cors, {
  origin: corsOrigins.length > 0 ? corsOrigins : false,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
});

const basePath = config.server.base_path || '';

await server.register(healthRoutes);
await server.register(metricsRoutes);
await server.register(openapiRoutes(config));
if (basePath) {
  await server.register(healthRoutes, { prefix: basePath });
  await server.register(metricsRoutes, { prefix: basePath });
  await server.register(openapiRoutes(config), { prefix: basePath });
}
await server.register(authRoutes(oauth2Handler));
if (basePath) {
  await server.register(authRoutes(oauth2Handler), { prefix: basePath });
}
await server.register(workbookRoutes(registry, authMiddleware, aclChecker), { prefix: basePath });
await server.register(sheetRoutes(registry, authMiddleware, aclChecker), { prefix: basePath });
await server.register(cellRoutes(registry, authMiddleware, aclChecker), { prefix: basePath });
await server.register(recordRoutes(registry, authMiddleware, aclChecker), { prefix: basePath });
await server.register(operationRoutes(registry, authMiddleware, aclChecker), { prefix: basePath });
await server.register(lockStatusRoutes(registry, authMiddleware, aclChecker), { prefix: basePath });

const start = async (): Promise<void> => {
  const port = config.server.port;
  const host = config.server.host;
  await server.listen({ port, host });
  logger.info(`Server listening at ${config.server.tls.enabled ? 'https' : 'http'}://${host}:${port}`);

  if (config.lifecycle?.life) {
    const lifeMs = parseDuration(config.lifecycle.life);
    logger.info(`Lifecycle limit set to ${config.lifecycle.life}, will shut down gracefully after this duration`);
    setTimeout(async () => {
      logger.info('Lifecycle limit reached, initiating graceful shutdown');
      await server.close();
      logger.info('Server shut down gracefully');
      process.exit(0);
    }, lifeMs);
  }
};

start().catch((err) => {
  logger.error('Server startup failed', { error: err.message });
  process.exit(1);
});
