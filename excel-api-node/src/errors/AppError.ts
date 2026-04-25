// Domain error class hierarchy

export class AppError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode: number,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class NotFoundError extends AppError {
  constructor(code: string, message: string, details?: Record<string, unknown>) {
    super(code, message, 404, details);
  }
}

export class WorkbookNotFoundError extends NotFoundError {
  constructor(id: string) {
    super('WORKBOOK_NOT_FOUND', `Workbook with ID '${id}' not found`);
  }
}

export class SheetNotFoundError extends NotFoundError {
  constructor(sheetName: string) {
    super('SHEET_NOT_FOUND', `Sheet '${sheetName}' not found in workbook`);
  }
}

export class RowNotFoundError extends NotFoundError {
  constructor(message: string) {
    super('ROW_NOT_FOUND', message);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super('INVALID_REQUEST', message, 400, details);
  }
}

export class ReadonlyWorkbookError extends AppError {
  constructor() {
    super('READONLY_WORKBOOK', 'Workbook is readonly', 422);
  }
}

export class FileLockError extends AppError {
  constructor(message: string) {
    super('FILE_LOCKED', message, 409);
  }
}

export class ServiceBusyError extends AppError {
  constructor(message: string) {
    super('SERVICE_BUSY', message, 503);
  }
}
