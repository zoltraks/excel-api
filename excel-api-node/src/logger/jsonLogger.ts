// Logger module with structured JSON logging
// Follows ARCHITECTURE.md logging format specification

export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  DEBUG = 'debug'
}

export interface LogData {
  level: string;
  date: string;
  time: string;
  message: string;
  request?: {
    method?: string;
    url?: string;
  };
  response?: {
    statusCode?: number;
    responseTime?: number;
  };
  remote?: string;
}

class Logger {
  private level: LogLevel;

  constructor(level: LogLevel = LogLevel.INFO) {
    this.level = level;
  }

  private shouldLog(level: LogLevel): boolean {
    const levels = [LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR];
    return levels.indexOf(level) >= levels.indexOf(this.level);
  }

  private formatLog(level: LogLevel, message: string, additional?: Record<string, unknown>): LogData {
    const now = new Date();
    const date = now.toISOString().split('T')[0];
    const time = now.toTimeString().split(' ')[0] + '.' + now.getMilliseconds().toString().padStart(3, '0');

    return {
      level,
      date,
      time,
      message,
      ...additional
    };
  }

  private output(logData: LogData): void {
    console.log(JSON.stringify(logData));
  }

  error(message: string, additional?: Record<string, unknown>): void {
    if (this.shouldLog(LogLevel.ERROR)) {
      this.output(this.formatLog(LogLevel.ERROR, message, additional));
    }
  }

  warn(message: string, additional?: Record<string, unknown>): void {
    if (this.shouldLog(LogLevel.WARN)) {
      this.output(this.formatLog(LogLevel.WARN, message, additional));
    }
  }

  info(message: string, additional?: Record<string, unknown>): void {
    if (this.shouldLog(LogLevel.INFO)) {
      this.output(this.formatLog(LogLevel.INFO, message, additional));
    }
  }

  debug(message: string, additional?: Record<string, unknown>): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      this.output(this.formatLog(LogLevel.DEBUG, message, additional));
    }
  }

  setLevel(level: LogLevel): void {
    this.level = level;
  }
}

let loggerInstance: Logger | null = null;

export function initLogger(level: LogLevel = LogLevel.INFO): Logger {
  if (!loggerInstance) {
    loggerInstance = new Logger(level);
  }
  return loggerInstance;
}

export function getLogger(): Logger {
  if (!loggerInstance) {
    throw new Error('Logger not initialized. Call initLogger first.');
  }
  return loggerInstance;
}
