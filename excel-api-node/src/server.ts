// Excel API Node  HTTP service entry point

import Fastify from 'fastify';
import * as fs from 'fs';
import * as path from 'path';
import { loadConfig, loadAccessConfig } from './config/loader.js';
import { initRegistry, getRegistry } from './workbook/registry.js';
import { JWTAuth, OAuth2Handler, StaticTokenAuth } from './auth/jwt.js';
import { ACLChecker } from './auth/acl.js';
import { createAuthMiddleware } from './auth/middleware.js';
import { initFileLock } from './lock/lockfile.js';
import { initCache } from './cache/mtimeCache.js';
import cors from '@fastify/cors';
import { initLogger, getLogger, LogLevel } from './logger/index.js';
import { parseDuration } from './util/duration.js';
import { parseArgs } from './cli/args.js';
import { healthRoutes } from './routes/health.js';
import { metricsRoutes } from './routes/metrics.js';
import { openapiRoutes } from './routes/openapi.js';
import { authRoutes } from './routes/auth.js';
import { workbookRoutes } from './routes/workbooks.js';
import { sheetRoutes } from './routes/sheets.js';
import { cellRoutes } from './routes/cells.js';
import { recordRoutes } from './routes/records.js';
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
initCache(config.cache.enabled, config.cache.poll_interval_ms);

class RotatingFileLogger {
  private logDir: string;
  private logPath: string;
  private maxFiles: number;
  private currentLogFile: string;
  private currentDate: string;

  constructor(logPath: string, maxFiles: number = 7) {
    this.logPath = logPath;
    this.maxFiles = maxFiles;
    this.logDir = path.dirname(logPath);
    this.currentDate = this.getDateString();
    this.currentLogFile = this.getLogFileName();
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  private getDateString(): string {
    const now = new Date();
    return now.toISOString().split('T')[0];
  }

  private getLogFileName(): string {
    const date = this.getDateString();
    const ext = path.extname(this.logPath);
    const baseName = path.basename(this.logPath, ext);
    return path.join(this.logDir, `${baseName}-${date}${ext}`);
  }

  private rotateIfNeeded(): void {
    const today = this.getDateString();
    if (today !== this.currentDate) {
      this.cleanOldLogs();
      this.currentDate = today;
      this.currentLogFile = this.getLogFileName();
    }
  }

  private cleanOldLogs(): void {
    const files = fs.readdirSync(this.logDir);
    const logFiles = files.filter(f =>
      f.startsWith(path.basename(this.logPath, path.extname(this.logPath)))
    );
    logFiles.sort().reverse();
    for (let i = this.maxFiles; i < logFiles.length; i++) {
      const filePath = path.join(this.logDir, logFiles[i]);
      try { fs.unlinkSync(filePath); } catch { /* ignore */ }
    }
  }

  log(data: Record<string, unknown>): void {
    this.rotateIfNeeded();
    const logLine = JSON.stringify(data) + '\n';
    fs.appendFileSync(this.currentLogFile, logLine);
  }
}

let fileLogger: RotatingFileLogger | null = null;
if (config.logging.file && config.logging.file.enabled) {
  fileLogger = new RotatingFileLogger(config.logging.file.path, config.logging.file.max_files || 7);
}

const server = Fastify({ logger: false });

server.addHook('onResponse', (request, reply, done) => {
  const now = new Date();
  const logData = {
    level: 'info',
    date: now.toISOString().split('T')[0],
    time: now.toTimeString().split(' ')[0] + '.' + now.getMilliseconds().toString().padStart(3, '0'),
    message: 'Request completed',
    request: { method: request.method, url: request.url },
    response: { statusCode: reply.statusCode, responseTime: reply.elapsedTime },
    remote: request.ip,
  };
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

await server.register(cors, {
  origin: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
});

await server.register(healthRoutes);
await server.register(metricsRoutes);
await server.register(openapiRoutes(config));
await server.register(authRoutes(oauth2Handler));
await server.register(workbookRoutes(registry, authMiddleware, aclChecker));
await server.register(sheetRoutes(registry, authMiddleware, aclChecker));
await server.register(cellRoutes(registry, authMiddleware, aclChecker));
await server.register(recordRoutes(registry, authMiddleware, aclChecker));
await server.register(lockStatusRoutes(registry, authMiddleware, aclChecker));

const start = async (): Promise<void> => {
  const port = config.server.port;
  const host = config.server.host;
  await server.listen({ port, host });
  logger.info(`Server listening at http://${host}:${port}`);

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
