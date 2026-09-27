// RotatingFileLogger — date-rotating JSON-lines file sink for request logs
// Extracted from server.ts so the entry point stays bootstrap-only

import * as fs from 'fs';
import * as path from 'path';
import type { FastifyReply, FastifyRequest } from 'fastify';

export class RotatingFileLogger {
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

export function createFileLogger(
  fileConfig: { enabled: boolean; path: string; max_files?: number } | undefined
): RotatingFileLogger | null {
  if (!fileConfig || !fileConfig.enabled) { return null; }
  return new RotatingFileLogger(fileConfig.path, fileConfig.max_files || 7);
}

export function buildRequestLogRecord(request: FastifyRequest, reply: FastifyReply): Record<string, unknown> {
  const now = new Date();
  return {
    level: 'info',
    date: now.toISOString().split('T')[0],
    time: now.toTimeString().split(' ')[0] + '.' + now.getMilliseconds().toString().padStart(3, '0'),
    message: 'Request completed',
    request: { method: request.method, url: request.url },
    response: { statusCode: reply.statusCode, responseTime: reply.elapsedTime },
    remote: request.ip,
  };
}
