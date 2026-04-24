// Excel API Node — HTTP service entry point

import Fastify from 'fastify';
import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'yaml';
import { loadConfig, loadAccessConfig } from './config/loader.js';
import { metrics } from './metrics/collector.js';
import { initRegistry, getRegistry } from './workbook/registry.js';
import { readSheetNames, readCell, readRange, readRecords, readRecord, writeCell, addRecord, updateRecord, deleteRecord, getSheetMetadata, getColumnDefinitions } from './excel/operations.js';
import { JWTAuth, OAuth2Handler, StaticTokenAuth } from './auth/jwt.js';
import { ACLChecker } from './auth/acl.js';
import { createAuthMiddleware, createScopeCheckMiddleware } from './auth/middleware.js';
import { initFileLock, getFileLock } from './lock/lockfile.js';
import { initCache, getCache } from './cache/mtimeCache.js';
import cors from '@fastify/cors';

// Parse command-line arguments
function parseArgs(): { workDir?: string; configPath?: string; accessPath?: string } {
  const args = process.argv.slice(2);
  const result: { workDir?: string; configPath?: string; accessPath?: string } = {};

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--work' && i + 1 < args.length) {
      result.workDir = args[i + 1];
      i++;
    } else if (args[i] === '--config' && i + 1 < args.length) {
      result.configPath = args[i + 1];
      i++;
    } else if (args[i] === '--access' && i + 1 < args.length) {
      result.accessPath = args[i + 1];
      i++;
    }
  }

  return result;
}

const args = parseArgs();

const config = loadConfig({
  ...(args.workDir && { workDir: args.workDir }),
  ...(args.configPath && { configPath: args.configPath }),
});
initRegistry(config);
const registry = getRegistry();

// Initialize authentication
const accessConfig = loadAccessConfig({
  ...(args.workDir && { workDir: args.workDir }),
  ...(args.accessPath && { accessPath: args.accessPath }),
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

// Rotating file logger with daily rotation
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
    
    // Ensure log directory exists
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
      // Clean up old log files
      this.cleanOldLogs();
      this.currentDate = today;
      this.currentLogFile = this.getLogFileName();
    }
  }

  private cleanOldLogs(): void {
    const files = fs.readdirSync(this.logDir);
    const logFiles = files.filter(f => f.startsWith(path.basename(this.logPath, path.extname(this.logPath))));
    logFiles.sort().reverse();
    
    for (let i = this.maxFiles; i < logFiles.length; i++) {
      const filePath = path.join(this.logDir, logFiles[i]);
      try {
        fs.unlinkSync(filePath);
      } catch (e) {
        // Ignore errors when cleaning up
      }
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

const server = Fastify({
  logger: {
    level: config.logging.level,
  },
});

// Add file logging hook
if (fileLogger) {
  server.addHook('onResponse', (request, reply, done) => {
    const logData = {
      level: 'info',
      time: Date.now(),
      req: {
        method: request.method,
        url: request.url,
        hostname: request.hostname,
        remoteAddress: request.ip,
      },
      res: {
        statusCode: reply.statusCode,
        responseTime: reply.getResponseTime(),
      },
    };
    fileLogger.log(logData);
    done();
  });
}

// Register content type parser for application/x-www-form-urlencoded
server.addContentTypeParser('application/x-www-form-urlencoded', (_request, payload, done) => {
  let body = '';
  payload.on('data', (chunk: Buffer) => {
    body += chunk.toString();
  });
  payload.on('end', () => {
    try {
      const params = new URLSearchParams(body);
      const parsed: Record<string, string> = {};
      params.forEach((value, key) => {
        parsed[key] = value;
      });
      done(null, parsed);
    } catch (err) {
      done(err as Error);
    }
  });
});

// Register CORS
await server.register(cors, {
  origin: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
});

server.get('/health', async () => {
  const now = new Date();
  return {
    status: 'ok',
    implementation: 'excel-api-node',
    version: '0.0.1',
    uptime_seconds: Math.floor(process.uptime()),
    server_time: now.toISOString(),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  };
});

server.post<{
  Body: {
    grant_type: 'client_credentials' | 'password';
    client_id?: string;
    client_secret?: string;
    username?: string;
    password?: string;
  };
}>(
  '/auth/token',
  async (request, reply) => {
    metrics.incrementCounter('excel_api_auth_token_requests_total');
    const startTime = Date.now();

    try {
      let tokenResponse;

      if (request.body.grant_type === 'client_credentials') {
        if (!request.body.client_id || !request.body.client_secret) {
          return reply.status(400).send({
            error: 'invalid_request',
            error_description: 'client_id and client_secret are required',
          });
        }
        tokenResponse = await oauth2Handler.handleClientCredentialsGrant(
          request.body.client_id,
          request.body.client_secret
        );
      } else if (request.body.grant_type === 'password') {
        if (!request.body.username || !request.body.password) {
          return reply.status(400).send({
            error: 'invalid_request',
            error_description: 'username and password are required',
          });
        }
        tokenResponse = await oauth2Handler.handlePasswordGrant(
          request.body.username,
          request.body.password
        );
      } else {
        return reply.status(400).send({
          error: 'unsupported_grant_type',
          error_description: 'Only client_credentials and password grants are supported',
        });
      }

      metrics.observeHistogram('excel_api_auth_token_duration_ms', Date.now() - startTime);
      return tokenResponse;
    } catch (error) {
      metrics.incrementCounter('excel_api_errors_total', 1, { error: 'AUTH_FAILED' });
      return reply.status(401).send({
        error: 'invalid_client',
        error_description: error instanceof Error ? error.message : 'Authentication failed',
      });
    }
  }
);

server.get('/metrics', async (_request, reply) => {
  reply.type('text/plain');
  return metrics.toOpenMetrics();
});

server.get('/openapi.yaml', async (_request, reply) => {
  const openapiPath = './resources/openapi.yaml';
  const openapiContent = fs.readFileSync(openapiPath, 'utf8');
  const openapiDoc = yaml.parse(openapiContent);

  // Replace dynamic fields
  openapiDoc.servers[0].url = `${config.server.tls.enabled ? 'https' : 'http'}://${config.server.host}:${config.server.port}${config.server.base_path}`;
  openapiDoc.info.version = '0.0.1';
  openapiDoc.info.title = 'Excel API (excel-api-node)';

  reply.type('application/yaml');
  return yaml.stringify(openapiDoc);
});

server.get('/openapi.json', async (_request) => {
  const openapiPath = './resources/openapi.yaml';
  const openapiContent = fs.readFileSync(openapiPath, 'utf8');
  const openapiDoc = yaml.parse(openapiContent);

  // Replace dynamic fields
  openapiDoc.servers[0].url = `${config.server.tls.enabled ? 'https' : 'http'}://${config.server.host}:${config.server.port}${config.server.base_path}`;
  openapiDoc.info.version = '0.0.1';
  openapiDoc.info.title = 'Excel API (excel-api-node)';

  return openapiDoc;
});

server.get('/workbooks', { preHandler: [authMiddleware, createScopeCheckMiddleware(aclChecker, 'read', false)] }, async () => {
  metrics.incrementCounter('excel_api_workbooks_list_requests_total');
  const startTime = Date.now();

  const workbooks = registry.getAll();
  const response = {
    items: workbooks.map((wb) => ({
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
});

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
      sheets: sheets.map((s) => ({ name: s.name, index: s.index + 1 })), // 1-based index
    };
  }
);

server.get<{ Params: { id: string; sheetName: string } }>(
  '/workbooks/:id/sheets/:sheetName',
  { preHandler: [authMiddleware, createScopeCheckMiddleware(aclChecker, 'read', false)] },
  async (request, reply) => {
    metrics.incrementCounter('excel_api_sheet_get_requests_total');
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
    const sheet = sheets.find((s) => s.name === request.params.sheetName);
    if (!sheet) {
      metrics.incrementCounter('excel_api_errors_total', 1, { error: 'SHEET_NOT_FOUND' });
      return reply.status(404).send({
        error: 'SHEET_NOT_FOUND',
        message: `Sheet '${request.params.sheetName}' not found in workbook`,
      });
    }

    metrics.observeHistogram('excel_api_sheet_get_duration_ms', Date.now() - startTime);
    const metadata = await getSheetMetadata(workbook.path, sheet.name);
    return metadata;
  }
);

server.get<{ Params: { id: string; sheetName: string } }>(
  '/workbooks/:id/sheets/:sheetName/columns',
  { preHandler: [authMiddleware, createScopeCheckMiddleware(aclChecker, 'read', false)] },
  async (request, reply) => {
    metrics.incrementCounter('excel_api_columns_get_requests_total');
    const startTime = Date.now();

    const workbook = registry.get(request.params.id);
    if (!workbook) {
      metrics.incrementCounter('excel_api_errors_total', 1, { error: 'WORKBOOK_NOT_FOUND' });
      return reply.status(404).send({
        error: 'WORKBOOK_NOT_FOUND',
        message: `Workbook with ID '${request.params.id}' not found`,
      });
    }

    try {
      const columns = await getColumnDefinitions(workbook.path, request.params.sheetName);
      metrics.observeHistogram('excel_api_columns_get_duration_ms', Date.now() - startTime);
      return columns;
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        metrics.incrementCounter('excel_api_errors_total', 1, { error: 'SHEET_NOT_FOUND' });
        return reply.status(404).send({
          error: 'SHEET_NOT_FOUND',
          message: error.message,
        });
      }
      metrics.incrementCounter('excel_api_errors_total', 1, { error: 'INTERNAL_ERROR' });
      throw error;
    }
  }
);

server.get<{
  Params: { id: string; sheetName: string; cellRef: string };
  Querystring: { format?: 'native' | 'display' | 'string' };
}>(
  '/workbooks/:id/sheets/:sheetName/cells/:cellRef',
  { preHandler: [authMiddleware, createScopeCheckMiddleware(aclChecker, 'read', false)] },
  async (request, reply) => {
    metrics.incrementCounter('excel_api_cell_get_requests_total');
    const startTime = Date.now();

    const workbook = registry.get(request.params.id);
    if (!workbook) {
      metrics.incrementCounter('excel_api_errors_total', 1, { error: 'WORKBOOK_NOT_FOUND' });
      return reply.status(404).send({
        error: 'WORKBOOK_NOT_FOUND',
        message: `Workbook with ID '${request.params.id}' not found`,
      });
    }

    const format = request.query.format ?? 'native';

    try {
      const cellData = await readCell(
        workbook.path,
        request.params.sheetName,
        request.params.cellRef,
        format
      );

      metrics.observeHistogram('excel_api_cell_get_duration_ms', Date.now() - startTime);
      return cellData;
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        metrics.incrementCounter('excel_api_errors_total', 1, { error: 'SHEET_NOT_FOUND' });
        return reply.status(404).send({
          error: 'SHEET_NOT_FOUND',
          message: error.message,
        });
      }
      metrics.incrementCounter('excel_api_errors_total', 1, { error: 'INTERNAL_ERROR' });
      throw error;
    }
  }
);

server.put<{
  Params: { id: string; sheetName: string; cellRef: string };
  Body: { value: unknown };
}>(
  '/workbooks/:id/sheets/:sheetName/cells/:cellRef',
  { preHandler: [authMiddleware, createScopeCheckMiddleware(aclChecker, 'write', false)] },
  async (request, reply) => {
    metrics.incrementCounter('excel_api_cell_write_requests_total');
    const startTime = Date.now();

    const workbook = registry.get(request.params.id);
    if (!workbook) {
      metrics.incrementCounter('excel_api_errors_total', 1, { error: 'WORKBOOK_NOT_FOUND' });
      return reply.status(404).send({
        error: 'WORKBOOK_NOT_FOUND',
        message: `Workbook with ID '${request.params.id}' not found`,
      });
    }

    if (workbook.readonly) {
      metrics.incrementCounter('excel_api_errors_total', 1, { error: 'READONLY_WORKBOOK' });
      return reply.status(422).send({
        error: 'READONLY_WORKBOOK',
        message: 'Workbook is readonly',
      });
    }

    const fileLock = getFileLock();
    try {
      await fileLock.acquire(request.params.id);
    } catch (error) {
      metrics.incrementCounter('excel_api_errors_total', 1, { error: 'FILE_LOCKED' });
      return reply.status(409).send({
        error: 'FILE_LOCKED',
        message: error instanceof Error ? error.message : 'File is locked',
      });
    }

    try {
      const cellData = await writeCell(
        workbook.path,
        request.params.sheetName,
        request.params.cellRef,
        request.body.value
      );

      const cache = getCache();
      cache.invalidate(workbook.path);

      metrics.observeHistogram('excel_api_cell_write_duration_ms', Date.now() - startTime);
      return cellData;
    } catch (error) {
      metrics.incrementCounter('excel_api_errors_total', 1, { error: 'INTERNAL_ERROR' });
      throw error;
    } finally {
      fileLock.release(request.params.id);
    }
  }
);

server.get<{
  Params: { id: string; sheetName: string; rangeRef: string };
  Querystring: { format?: 'native' | 'display' | 'string' };
}>(
  '/workbooks/:id/sheets/:sheetName/ranges/:rangeRef',
  { preHandler: [authMiddleware, createScopeCheckMiddleware(aclChecker, 'read', false)] },
  async (request, reply) => {
    metrics.incrementCounter('excel_api_range_get_requests_total');
    const startTime = Date.now();

    const workbook = registry.get(request.params.id);
    if (!workbook) {
      metrics.incrementCounter('excel_api_errors_total', 1, { error: 'WORKBOOK_NOT_FOUND' });
      return reply.status(404).send({
        error: 'WORKBOOK_NOT_FOUND',
        message: `Workbook with ID '${request.params.id}' not found`,
      });
    }

    const format = request.query.format ?? 'native';

    try {
      const rangeData = await readRange(
        workbook.path,
        request.params.sheetName,
        request.params.rangeRef,
        format
      );

      metrics.observeHistogram('excel_api_range_get_duration_ms', Date.now() - startTime);
      return rangeData;
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        metrics.incrementCounter('excel_api_errors_total', 1, { error: 'SHEET_NOT_FOUND' });
        return reply.status(404).send({
          error: 'SHEET_NOT_FOUND',
          message: error.message,
        });
      }
      metrics.incrementCounter('excel_api_errors_total', 1, { error: 'INTERNAL_ERROR' });
      throw error;
    }
  }
);

server.get<{
  Params: { id: string; sheetName: string };
  Querystring: {
    offset?: number;
    limit?: number;
    format?: 'native' | 'display' | 'string';
  };
}>(
  '/workbooks/:id/sheets/:sheetName/records',
  { preHandler: [authMiddleware, createScopeCheckMiddleware(aclChecker, 'read', false)] },
  async (request, reply) => {
    metrics.incrementCounter('excel_api_records_list_requests_total');
    const startTime = Date.now();

    const workbook = registry.get(request.params.id);
    if (!workbook) {
      metrics.incrementCounter('excel_api_errors_total', 1, { error: 'WORKBOOK_NOT_FOUND' });
      return reply.status(404).send({
        error: 'WORKBOOK_NOT_FOUND',
        message: `Workbook with ID '${request.params.id}' not found`,
      });
    }

    const offset = request.query.offset ?? 0;
    const limit = Math.min(request.query.limit ?? 100, 1000);
    const format = request.query.format ?? 'native';

    try {
      const records = await readRecords(
        workbook.path,
        request.params.sheetName,
        1, // headerRowCount - TODO: make configurable
        offset,
        limit,
        format
      );

      metrics.observeHistogram('excel_api_records_list_duration_ms', Date.now() - startTime);
      return records;
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        metrics.incrementCounter('excel_api_errors_total', 1, { error: 'SHEET_NOT_FOUND' });
        return reply.status(404).send({
          error: 'SHEET_NOT_FOUND',
          message: error.message,
        });
      }
      if (error instanceof Error && error.message.includes('not configured')) {
        metrics.incrementCounter('excel_api_errors_total', 1, { error: 'SHEET_NOT_CONFIGURED' });
        return reply.status(400).send({
          error: 'SHEET_NOT_CONFIGURED',
          message: 'Sheet is not configured for tabular access',
        });
      }
      metrics.incrementCounter('excel_api_errors_total', 1, { error: 'INTERNAL_ERROR' });
      throw error;
    }
  }
);

server.post<{
  Params: { id: string; sheetName: string };
  Body: { data: Record<string, unknown>; after_row?: number; copy_style_from?: number };
}>(
  '/workbooks/:id/sheets/:sheetName/records',
  { preHandler: [authMiddleware, createScopeCheckMiddleware(aclChecker, 'write', false)] },
  async (request, reply) => {
    metrics.incrementCounter('excel_api_record_add_requests_total');
    const startTime = Date.now();

    const workbook = registry.get(request.params.id);
    if (!workbook) {
      metrics.incrementCounter('excel_api_errors_total', 1, { error: 'WORKBOOK_NOT_FOUND' });
      return reply.status(404).send({
        error: 'WORKBOOK_NOT_FOUND',
        message: `Workbook with ID '${request.params.id}' not found`,
      });
    }

    if (workbook.readonly) {
      metrics.incrementCounter('excel_api_errors_total', 1, { error: 'READONLY_WORKBOOK' });
      return reply.status(422).send({
        error: 'READONLY_WORKBOOK',
        message: 'Workbook is readonly',
      });
    }

    const fileLock = getFileLock();
    try {
      await fileLock.acquire(request.params.id);
    } catch (error) {
      metrics.incrementCounter('excel_api_errors_total', 1, { error: 'FILE_LOCKED' });
      return reply.status(409).send({
        error: 'FILE_LOCKED',
        message: error instanceof Error ? error.message : 'File is locked',
      });
    }

    try {
      const record = await addRecord(
        workbook.path,
        request.params.sheetName,
        request.body.data,
        request.body.after_row,
        request.body.copy_style_from
      );

      const cache = getCache();
      cache.invalidate(workbook.path);

      metrics.observeHistogram('excel_api_record_add_duration_ms', Date.now() - startTime);
      reply.status(201).send(record);
    } catch (error) {
      metrics.incrementCounter('excel_api_errors_total', 1, { error: 'INTERNAL_ERROR' });
      throw error;
    } finally {
      fileLock.release(request.params.id);
    }
  }
);

server.get<{
  Params: { id: string; sheetName: string; recordIndex: number };
  Querystring: { format?: 'native' | 'display' | 'string' };
}>(
  '/workbooks/:id/sheets/:sheetName/records/:recordIndex',
  { preHandler: [authMiddleware, createScopeCheckMiddleware(aclChecker, 'read', false)] },
  async (request, reply) => {
    metrics.incrementCounter('excel_api_record_get_requests_total');
    const startTime = Date.now();

    const workbook = registry.get(request.params.id);
    if (!workbook) {
      metrics.incrementCounter('excel_api_errors_total', 1, { error: 'WORKBOOK_NOT_FOUND' });
      return reply.status(404).send({
        error: 'WORKBOOK_NOT_FOUND',
        message: `Workbook with ID '${request.params.id}' not found`,
      });
    }

    const format = request.query.format ?? 'native';

    try {
      const record = await readRecord(
        workbook.path,
        request.params.sheetName,
        request.params.recordIndex,
        1, // headerRowCount - TODO: make configurable
        format
      );

      metrics.observeHistogram('excel_api_record_get_duration_ms', Date.now() - startTime);
      return record;
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        metrics.incrementCounter('excel_api_errors_total', 1, { error: 'SHEET_NOT_FOUND' });
        return reply.status(404).send({
          error: 'SHEET_NOT_FOUND',
          message: error.message,
        });
      }
      if (error instanceof Error && error.message.includes('out of range')) {
        metrics.incrementCounter('excel_api_errors_total', 1, { error: 'ROW_NOT_FOUND' });
        return reply.status(404).send({
          error: 'ROW_NOT_FOUND',
          message: error.message,
        });
      }
      metrics.incrementCounter('excel_api_errors_total', 1, { error: 'INTERNAL_ERROR' });
      throw error;
    }
  }
);

server.put<{
  Params: { id: string; sheetName: string; recordIndex: number };
  Body: { data: Record<string, unknown> };
}>(
  '/workbooks/:id/sheets/:sheetName/records/:recordIndex',
  { preHandler: [authMiddleware, createScopeCheckMiddleware(aclChecker, 'write', false)] },
  async (request, reply) => {
    metrics.incrementCounter('excel_api_record_update_requests_total');
    const startTime = Date.now();

    const workbook = registry.get(request.params.id);
    if (!workbook) {
      metrics.incrementCounter('excel_api_errors_total', 1, { error: 'WORKBOOK_NOT_FOUND' });
      return reply.status(404).send({
        error: 'WORKBOOK_NOT_FOUND',
        message: `Workbook with ID '${request.params.id}' not found`,
      });
    }

    if (workbook.readonly) {
      metrics.incrementCounter('excel_api_errors_total', 1, { error: 'READONLY_WORKBOOK' });
      return reply.status(422).send({
        error: 'READONLY_WORKBOOK',
        message: 'Workbook is readonly',
      });
    }

    const fileLock = getFileLock();
    try {
      await fileLock.acquire(request.params.id);
    } catch (error) {
      metrics.incrementCounter('excel_api_errors_total', 1, { error: 'FILE_LOCKED' });
      return reply.status(409).send({
        error: 'FILE_LOCKED',
        message: error instanceof Error ? error.message : 'File is locked',
      });
    }

    try {
      const record = await updateRecord(
        workbook.path,
        request.params.sheetName,
        request.params.recordIndex,
        request.body.data
      );

      const cache = getCache();
      cache.invalidate(workbook.path);

      metrics.observeHistogram('excel_api_record_update_duration_ms', Date.now() - startTime);
      return record;
    } catch (error) {
      metrics.incrementCounter('excel_api_errors_total', 1, { error: 'INTERNAL_ERROR' });
      throw error;
    } finally {
      fileLock.release(request.params.id);
    }
  }
);

server.delete<{
  Params: { id: string; sheetName: string; recordIndex: number };
}>(
  '/workbooks/:id/sheets/:sheetName/records/:recordIndex',
  { preHandler: [authMiddleware, createScopeCheckMiddleware(aclChecker, 'write', false)] },
  async (request, reply) => {
    metrics.incrementCounter('excel_api_record_delete_requests_total');
    const startTime = Date.now();

    const workbook = registry.get(request.params.id);
    if (!workbook) {
      metrics.incrementCounter('excel_api_errors_total', 1, { error: 'WORKBOOK_NOT_FOUND' });
      return reply.status(404).send({
        error: 'WORKBOOK_NOT_FOUND',
        message: `Workbook with ID '${request.params.id}' not found`,
      });
    }

    if (workbook.readonly) {
      metrics.incrementCounter('excel_api_errors_total', 1, { error: 'READONLY_WORKBOOK' });
      return reply.status(422).send({
        error: 'READONLY_WORKBOOK',
        message: 'Workbook is readonly',
      });
    }

    const fileLock = getFileLock();
    try {
      await fileLock.acquire(request.params.id);
    } catch (error) {
      metrics.incrementCounter('excel_api_errors_total', 1, { error: 'FILE_LOCKED' });
      return reply.status(409).send({
        error: 'FILE_LOCKED',
        message: error instanceof Error ? error.message : 'File is locked',
      });
    }

    try {
      await deleteRecord(
        workbook.path,
        request.params.sheetName,
        request.params.recordIndex
      );

      const cache = getCache();
      cache.invalidate(workbook.path);

      metrics.observeHistogram('excel_api_record_delete_duration_ms', Date.now() - startTime);
      reply.status(204).send();
    } catch (error) {
      metrics.incrementCounter('excel_api_errors_total', 1, { error: 'INTERNAL_ERROR' });
      throw error;
    } finally {
      fileLock.release(request.params.id);
    }
  }
);

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
    const isLocked = fileLock.isLocked(request.params.id);

    const lockStatus = {
      locked: isLocked,
      queue_depth: 0,
    };

    metrics.observeHistogram('excel_api_lock_status_duration_ms', Date.now() - startTime);
    return lockStatus;
  }
);

const start = async (): Promise<void> => {
  const port = config.server.port;
  const host = config.server.host;
  await server.listen({ port, host });
};

start().catch((err) => {
  console.error(err);
  process.exit(1);
});
