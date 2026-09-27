// Excel file operations using ExcelJS

import ExcelJS from 'exceljs';
import type { SheetHeaderConfig } from '../config/types.js';
import {
  resolveSheetLayout,
  resolveColumnIds,
  colLetter as columnLetter,
  type SheetLayout,
} from './layout.js';

export interface CellData {
  ref: string;
  column: string;
  row: number;
  value: unknown;
  type: string;
  number_format: string | null;
  is_formula: boolean;
  formatted: string | null;
}

export interface RangeRow {
  row: number;
  cells: CellData[];
}

export interface RangeData {
  range: string;
  rows: RangeRow[];
}

function colLetter(col: number): string {
  let letters = '';
  let remaining = col;
  while (remaining > 0) {
    const mod = (remaining - 1) % 26;
    letters = String.fromCharCode(65 + mod) + letters;
    remaining = Math.floor((remaining - 1) / 26);
  }
  return letters;
}

export interface SheetInfo {
  name: string;
  index: number;
}

export async function readSheetNames(filePath: string): Promise<SheetInfo[]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);

  return workbook.worksheets.map((sheet, index) => ({
    name: sheet.name,
    index,
  }));
}

export async function readCell(
  filePath: string,
  sheetName: string,
  cellRef: string,
  format: 'native' | 'display' | 'string' = 'native'
): Promise<CellData> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);

  const sheet = workbook.getWorksheet(sheetName);
  if (!sheet) {
    throw new Error(`Sheet '${sheetName}' not found`);
  }

  const cell = sheet.getCell(cellRef);
  const position = parseCellRef(cellRef);
  const cellData: CellData = {
    ref: `${colLetter(position.col)}${position.row}`,
    column: colLetter(position.col),
    row: position.row,
    value: cell.value,
    type: getCellType(cell),
    number_format: cell.numFmt ?? null,
    is_formula: cell.formula !== undefined,
    formatted: null,
  };

  // Apply format transformation
  if (format === 'display') {
    cellData.formatted = cell.text;
    cellData.value = cell.text;
  } else if (format === 'string') {
    cellData.value = formatValueAsString(cell.value);
  }

  return cellData;
}

export async function readRange(
  filePath: string,
  sheetName: string,
  rangeRef: string,
  format: 'native' | 'display' | 'string' = 'native'
): Promise<RangeData> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);

  const sheet = workbook.getWorksheet(sheetName);
  if (!sheet) {
    throw new Error(`Sheet '${sheetName}' not found`);
  }

  const parts = rangeRef.split(':');
  if (parts.length !== 2) {
    throw new Error(`Invalid range reference '${rangeRef}'`);
  }
  const start = parseCellRef(parts[0]);
  const end = parseCellRef(parts[1]);
  if (end.row < start.row || end.col < start.col) {
    throw new Error(`Invalid range reference '${rangeRef}'`);
  }

  const rows: RangeRow[] = [];

  for (let row = start.row; row <= end.row; row++) {
    const cells: CellData[] = [];
    for (let col = start.col; col <= end.col; col++) {
      const cell = sheet.getCell(row, col);
      const column = colLetter(col);
      const cellData: CellData = {
        ref: `${column}${row}`,
        column,
        row,
        value: cell.value,
        type: getCellType(cell),
        number_format: cell.numFmt ?? null,
        is_formula: cell.formula !== undefined,
        formatted: null,
      };

      if (format === 'display') {
        cellData.formatted = cell.text;
        cellData.value = cell.text;
      } else if (format === 'string') {
        cellData.value = formatValueAsString(cell.value);
      }

      cells.push(cellData);
    }
    rows.push({ row, cells });
  }

  return { range: rangeRef, rows };
}

function parseCellRef(ref: string): { row: number; col: number } {
  const match = /^([A-Za-z]{1,3})(\d+)$/.exec(ref.trim());
  if (!match) {
    throw new Error(`Invalid cell reference '${ref}'`);
  }
  let col = 0;
  for (const ch of match[1].toUpperCase()) {
    col = col * 26 + (ch.charCodeAt(0) - 64);
  }
  return { row: parseInt(match[2], 10), col };
}

function getCellType(cell: ExcelJS.Cell): string {
  if (cell.type === ExcelJS.ValueType.String) return 'string';
  if (cell.type === ExcelJS.ValueType.Number) return 'number';
  if (cell.type === ExcelJS.ValueType.Boolean) return 'boolean';
  if (cell.type === ExcelJS.ValueType.Date) return 'date';
  if (cell.type === ExcelJS.ValueType.Formula) return 'formula';
  if (cell.value === null || cell.value === undefined) return 'empty';
  return 'string';
}

function formatValueAsString(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return value.toString();
  if (typeof value === 'boolean') return value.toString();
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

export interface RecordItem {
  index: number;
  data: Record<string, unknown>;
}

export interface RecordList {
  items: RecordItem[];
  total: number;
  offset: number;
  limit: number;
  format: string;
}

export async function readRecords(
  filePath: string,
  sheetName: string,
  sheetConfig?: SheetHeaderConfig,
  offset: number = 0,
  limit: number = 100,
  format: 'native' | 'display' | 'string' = 'native'
): Promise<RecordList> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);

  const sheet = workbook.getWorksheet(sheetName);
  if (!sheet) {
    throw new Error(`Sheet '${sheetName}' not found`);
  }

  const layout = resolveSheetLayout(sheetConfig);
  const headers = resolveColumnIds(workbook, sheet, layout);

  // Data rows start at layout.firstDataRow (1-based)
  const firstDataRow = layout.firstDataRow;
  const totalRows = sheet.rowCount as number;
  const totalDataRows = Math.max(0, totalRows - firstDataRow + 1);

  // Apply offset and limit (both 1-based)
  const startRow = firstDataRow + offset;
  const endRow = Math.min(startRow + limit - 1, totalRows);

  const items: RecordItem[] = [];
  for (let row = startRow; row <= endRow; row++) {
    const excelRow = sheet.getRow(row);
    const data: Record<string, unknown> = {};

    excelRow.eachCell((cell, colNumber) => {
      const header = headers[colNumber - 1];
      if (header) {
        let value = cell.value;

        // Apply format transformation
        if (format === 'display') {
          value = cell.text;
        } else if (format === 'string') {
          value = formatValueAsString(cell.value);
        }

        data[header] = value;
      }
    });

    // Calculate 1-based record index (offset + 1, +1 for each row)
    const recordIndex = offset + (row - startRow) + 1;
    items.push({ index: recordIndex, data });
  }

  return {
    items,
    total: totalDataRows,
    offset,
    limit,
    format,
  };
}

export async function readRecord(
  filePath: string,
  sheetName: string,
  recordIndex: number,
  sheetConfig?: SheetHeaderConfig,
  format: 'native' | 'display' | 'string' = 'native'
): Promise<RecordItem> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);

  const sheet = workbook.getWorksheet(sheetName);
  if (!sheet) {
    throw new Error(`Sheet '${sheetName}' not found`);
  }

  const layout = resolveSheetLayout(sheetConfig);
  const headers = resolveColumnIds(workbook, sheet, layout);

  // Convert 1-based record index to Excel row number
  const excelRowNumber = layout.firstDataRow + recordIndex - 1;
  const totalRows = sheet.rowCount as number;

  if (!Number.isInteger(recordIndex) || recordIndex < 1 || excelRowNumber > totalRows) {
    throw new Error(`Record index ${recordIndex} out of range`);
  }

  const excelRow = sheet.getRow(excelRowNumber);
  const data: Record<string, unknown> = {};

  excelRow.eachCell((cell, colNumber) => {
    const header = headers[colNumber - 1];
    if (header) {
      let value = cell.value;

      // Apply format transformation
      if (format === 'display') {
        value = cell.text;
      } else if (format === 'string') {
        value = formatValueAsString(cell.value);
      }

      data[header] = value;
    }
  });

  return {
    index: recordIndex,
    data,
  };
}

function getSheetOrThrow(workbook: ExcelJS.Workbook, sheetName: string): ExcelJS.Worksheet {
  const sheet = workbook.getWorksheet(sheetName);
  if (!sheet) {
    throw new Error(`Sheet '${sheetName}' not found`);
  }
  return sheet;
}

export function applyWriteCell(
  sheet: ExcelJS.Worksheet,
  cellRef: string,
  value: unknown
): CellData {
  const cell = sheet.getCell(cellRef);
  cell.value = value as ExcelJS.CellValue;

  const position = parseCellRef(cellRef);
  return {
    ref: `${colLetter(position.col)}${position.row}`,
    column: colLetter(position.col),
    row: position.row,
    value: cell.value,
    type: getCellType(cell),
    number_format: cell.numFmt ?? null,
    is_formula: cell.formula !== undefined,
    formatted: cell.text,
  };
}

export function applyClearCell(sheet: ExcelJS.Worksheet, cellRef: string): CellData {
  return applyWriteCell(sheet, cellRef, null);
}

export function applyAddRecord(
  sheet: ExcelJS.Worksheet,
  data: Record<string, unknown>,
  layout: SheetLayout,
  headers: string[],
  afterRow?: number,
  copyStyleFrom?: number
): RecordItem {
  if (afterRow !== undefined && afterRow < 0) {
    throw new Error(`Record index ${afterRow} out of range`);
  }
  const newRowNumber = afterRow !== undefined ? layout.firstDataRow + afterRow : sheet.rowCount + 1;
  if (afterRow !== undefined && newRowNumber <= sheet.rowCount) {
    sheet.spliceRows(newRowNumber, 0, []);
  }
  const newRow = sheet.getRow(newRowNumber);

  headers.forEach((header, colIndex) => {
    if (header && data[header] !== undefined) {
      newRow.getCell(colIndex + 1).value = data[header] as ExcelJS.CellValue;
    }
  });

  if (copyStyleFrom) {
    const styleRow = sheet.getRow(layout.firstDataRow + copyStyleFrom - 1);
    styleRow.eachCell((cell, colNumber) => {
      const targetCell = newRow.getCell(colNumber);
      targetCell.style = cell.style;
    });
  }

  return {
    index: newRowNumber - layout.firstDataRow + 1,
    data,
  };
}

export function applyUpdateRecord(
  sheet: ExcelJS.Worksheet,
  recordIndex: number,
  data: Record<string, unknown>,
  layout: SheetLayout,
  headers: string[]
): RecordItem {
  const excelRowNumber = layout.firstDataRow + recordIndex - 1;
  if (!Number.isInteger(recordIndex) || recordIndex < 1 || excelRowNumber > sheet.rowCount) {
    throw new Error(`Record index ${recordIndex} out of range`);
  }
  const row = sheet.getRow(excelRowNumber);

  headers.forEach((header, colIndex) => {
    if (header && data[header] !== undefined) {
      row.getCell(colIndex + 1).value = data[header] as ExcelJS.CellValue;
    }
  });

  return {
    index: recordIndex,
    data,
  };
}

export function applyDeleteRecord(
  sheet: ExcelJS.Worksheet,
  recordIndex: number,
  layout: SheetLayout
): void {
  const excelRowNumber = layout.firstDataRow + recordIndex - 1;
  if (!Number.isInteger(recordIndex) || recordIndex < 1 || excelRowNumber > sheet.rowCount) {
    throw new Error(`Record index ${recordIndex} out of range`);
  }
  sheet.spliceRows(excelRowNumber, 1);
}

export async function writeCell(
  filePath: string,
  sheetName: string,
  cellRef: string,
  value: unknown
): Promise<CellData> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);

  const cellData = applyWriteCell(getSheetOrThrow(workbook, sheetName), cellRef, value);

  await workbook.xlsx.writeFile(filePath);

  return cellData;
}

export async function addRecord(
  filePath: string,
  sheetName: string,
  data: Record<string, unknown>,
  sheetConfig?: SheetHeaderConfig,
  afterRow?: number,
  copyStyleFrom?: number
): Promise<RecordItem> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);

  const sheet = getSheetOrThrow(workbook, sheetName);
  const layout = resolveSheetLayout(sheetConfig);
  const record = applyAddRecord(
    sheet,
    data,
    layout,
    resolveColumnIds(workbook, sheet, layout),
    afterRow,
    copyStyleFrom
  );

  await workbook.xlsx.writeFile(filePath);

  return record;
}

export async function updateRecord(
  filePath: string,
  sheetName: string,
  recordIndex: number,
  data: Record<string, unknown>,
  sheetConfig?: SheetHeaderConfig
): Promise<RecordItem> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);

  const sheet = getSheetOrThrow(workbook, sheetName);
  const layout = resolveSheetLayout(sheetConfig);
  const record = applyUpdateRecord(
    sheet,
    recordIndex,
    data,
    layout,
    resolveColumnIds(workbook, sheet, layout)
  );

  await workbook.xlsx.writeFile(filePath);

  return record;
}

export async function deleteRecord(
  filePath: string,
  sheetName: string,
  recordIndex: number,
  sheetConfig?: SheetHeaderConfig
): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);

  const sheet = getSheetOrThrow(workbook, sheetName);
  const layout = resolveSheetLayout(sheetConfig);
  applyDeleteRecord(sheet, recordIndex, layout);

  await workbook.xlsx.writeFile(filePath);
}

export async function getSheetMetadata(
  filePath: string,
  sheetName: string,
  sheetConfig?: SheetHeaderConfig
): Promise<{
  name: string;
  row_count: number;
  column_count: number;
  mode: string;
  header_row: number;
  first_data_row: number;
}> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);

  const sheet = workbook.getWorksheet(sheetName);
  if (!sheet) {
    throw new Error(`Sheet '${sheetName}' not found`);
  }

  const layout = resolveSheetLayout(sheetConfig);
  return {
    name: sheet.name,
    row_count: sheet.rowCount as number,
    column_count: sheet.columnCount as number,
    mode: layout.mode === 'none' ? 'raw' : 'table',
    header_row: layout.identifierRow,
    first_data_row: layout.firstDataRow,
  };
}

export async function getColumnDefinitions(
  filePath: string,
  sheetName: string,
  sheetConfig?: SheetHeaderConfig
): Promise<{
  source: string;
  columns: Array<{
    index: number;
    letter: string;
    id: string;
    type: string;
    descriptions?: Record<string, string>;
    number_format: string | null;
  }>;
}> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);

  const sheet = workbook.getWorksheet(sheetName);
  if (!sheet) {
    throw new Error(`Sheet '${sheetName}' not found`);
  }

  const layout = resolveSheetLayout(sheetConfig);
  const ids = resolveColumnIds(workbook, sheet, layout);
  const columns: Array<{
    index: number;
    letter: string;
    id: string;
    type: string;
    descriptions?: Record<string, string>;
    number_format: string | null;
  }> = [];

  const typeRow = layout.typeRow ? sheet.getRow(layout.typeRow) : undefined;
  const descriptionRow = layout.descriptionRow ? sheet.getRow(layout.descriptionRow) : undefined;

  for (let colNumber = 1; colNumber <= Math.max(ids.length, 1); colNumber++) {
    const id = ids[colNumber - 1];
    if (!id) continue;
    const entry: (typeof columns)[number] = {
      index: colNumber,
      letter: columnLetter(colNumber),
      id,
      type: typeRow ? cellTextAt(typeRow, colNumber) || 'string' : 'string',
      number_format: null,
    };
    const description = descriptionRow ? cellTextAt(descriptionRow, colNumber) : '';
    if (description) {
      entry.descriptions = { default: description };
    }
    columns.push(entry);
  }

  const source =
    layout.mode === 'legend' ? 'legend_sheet' : layout.mode === 'multi' ? 'multi_row' : 'header_row';
  return { source, columns };
}

function cellTextAt(row: ExcelJS.Row, colNumber: number): string {
  const value = row.getCell(colNumber).value;
  if (value === null || value === undefined) return '';
  if (typeof value === 'object' && 'richText' in value && Array.isArray(value.richText)) {
    return value.richText.map((t) => t.text).join('');
  }
  if (typeof value === 'object' && 'text' in value) return String(value.text);
  return String(value);
}
