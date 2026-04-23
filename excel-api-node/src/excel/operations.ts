// Excel file operations using ExcelJS

import ExcelJS from 'exceljs';

export interface CellData {
  value: unknown;
  type: string;
  number_format: string | null;
  is_formula: boolean;
  formatted: string | null;
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
  const cellData: CellData = {
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
): Promise<CellData[][]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);

  const sheet = workbook.getWorksheet(sheetName);
  if (!sheet) {
    throw new Error(`Sheet '${sheetName}' not found`);
  }

  const range = sheet.getCell(rangeRef);
  const rangeValues: CellData[][] = [];

  // Get the actual range dimensions
  const startRow = Number(range.row);
  const startCol = Number(range.col);
  const endRow = Number(sheet.rowCount);
  const endCol = Number(sheet.columnCount);

  for (let row = startRow; row <= endRow; row++) {
    const rowData: CellData[] = [];
    for (let col = startCol; col <= endCol; col++) {
      const cell = sheet.getCell(row, col);
      const cellData: CellData = {
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

      rowData.push(cellData);
    }
    rangeValues.push(rowData);
  }

  return rangeValues;
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
  headerRowCount: number = 1,
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

  // Get header row to extract column identifiers
  const headerRow = sheet.getRow(headerRowCount);
  const headers: string[] = [];
  headerRow.eachCell((cell, colNumber) => {
    if (cell.value) {
      headers[colNumber - 1] = cell.value.toString(); // 1-based to 0-based
    }
  });

  // Calculate the Excel row number for the first data row (1-based)
  const firstDataRow = headerRowCount + 1;
  const totalRows = sheet.rowCount as number;
  const totalDataRows = Math.max(0, totalRows - headerRowCount);

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
  headerRowCount: number = 1,
  format: 'native' | 'display' | 'string' = 'native'
): Promise<RecordItem> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);

  const sheet = workbook.getWorksheet(sheetName);
  if (!sheet) {
    throw new Error(`Sheet '${sheetName}' not found`);
  }

  // Get header row to extract column identifiers
  const headerRow = sheet.getRow(headerRowCount);
  const headers: string[] = [];
  headerRow.eachCell((cell, colNumber) => {
    if (cell.value) {
      headers[colNumber - 1] = cell.value.toString(); // 1-based to 0-based
    }
  });

  // Convert 1-based record index to Excel row number
  const excelRowNumber = headerRowCount + recordIndex;
  const totalRows = sheet.rowCount as number;

  if (excelRowNumber > totalRows) {
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

export async function writeCell(
  filePath: string,
  sheetName: string,
  cellRef: string,
  value: unknown
): Promise<CellData> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);

  const sheet = workbook.getWorksheet(sheetName);
  if (!sheet) {
    throw new Error(`Sheet '${sheetName}' not found`);
  }

  const cell = sheet.getCell(cellRef);
  cell.value = value as ExcelJS.CellValue;

  await workbook.xlsx.writeFile(filePath);

  const cellData: CellData = {
    value: cell.value,
    type: getCellType(cell),
    number_format: cell.numFmt ?? null,
    is_formula: cell.formula !== undefined,
    formatted: cell.text,
  };

  return cellData;
}

export async function addRecord(
  filePath: string,
  sheetName: string,
  data: Record<string, unknown>,
  afterRow?: number,
  copyStyleFrom?: number
): Promise<RecordItem> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);

  const sheet = workbook.getWorksheet(sheetName);
  if (!sheet) {
    throw new Error(`Sheet '${sheetName}' not found`);
  }

  const headerRow = sheet.getRow(1);
  const headers: string[] = [];
  headerRow.eachCell((cell, colNumber) => {
    if (cell.value) {
      headers[colNumber - 1] = cell.value.toString();
    }
  });

  const newRowNumber = afterRow ? afterRow + 1 : sheet.rowCount + 1;
  const newRow = sheet.getRow(newRowNumber);

  headers.forEach((header, colIndex) => {
    if (data[header] !== undefined) {
      newRow.getCell(colIndex + 1).value = data[header] as ExcelJS.CellValue;
    }
  });

  if (copyStyleFrom) {
    const styleRow = sheet.getRow(copyStyleFrom);
    styleRow.eachCell((cell, colNumber) => {
      const targetCell = newRow.getCell(colNumber);
      targetCell.style = cell.style;
    });
  }

  await workbook.xlsx.writeFile(filePath);

  const recordIndex = newRowNumber - 1;
  return {
    index: recordIndex,
    data,
  };
}

export async function updateRecord(
  filePath: string,
  sheetName: string,
  recordIndex: number,
  data: Record<string, unknown>
): Promise<RecordItem> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);

  const sheet = workbook.getWorksheet(sheetName);
  if (!sheet) {
    throw new Error(`Sheet '${sheetName}' not found`);
  }

  const headerRow = sheet.getRow(1);
  const headers: string[] = [];
  headerRow.eachCell((cell, colNumber) => {
    if (cell.value) {
      headers[colNumber - 1] = cell.value.toString();
    }
  });

  const excelRowNumber = recordIndex + 1;
  const row = sheet.getRow(excelRowNumber);

  headers.forEach((header, colIndex) => {
    if (data[header] !== undefined) {
      row.getCell(colIndex + 1).value = data[header] as ExcelJS.CellValue;
    }
  });

  await workbook.xlsx.writeFile(filePath);

  return {
    index: recordIndex,
    data,
  };
}

export async function deleteRecord(
  filePath: string,
  sheetName: string,
  recordIndex: number
): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);

  const sheet = workbook.getWorksheet(sheetName);
  if (!sheet) {
    throw new Error(`Sheet '${sheetName}' not found`);
  }

  const excelRowNumber = recordIndex + 1;
  sheet.spliceRows(excelRowNumber, 1);

  await workbook.xlsx.writeFile(filePath);
}

export async function getSheetMetadata(
  filePath: string,
  sheetName: string
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

  return {
    name: sheet.name,
    row_count: sheet.rowCount as number,
    column_count: sheet.columnCount as number,
    mode: 'raw',
    header_row: 1,
    first_data_row: 2,
  };
}

export async function getColumnDefinitions(
  filePath: string,
  sheetName: string
): Promise<{
  source: string;
  columns: Array<{
    index: number;
    letter: string;
    id: string;
    type: string;
    number_format: string | null;
  }>;
}> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);

  const sheet = workbook.getWorksheet(sheetName);
  if (!sheet) {
    throw new Error(`Sheet '${sheetName}' not found`);
  }

  const headerRow = sheet.getRow(1);
  const columns: Array<{
    index: number;
    letter: string;
    id: string;
    type: string;
    number_format: string | null;
  }> = [];

  headerRow.eachCell((cell, colNumber) => {
    if (cell.value) {
      const column = sheet.getColumn(colNumber);
      columns.push({
        index: colNumber,
        letter: column.letter,
        id: cell.value.toString(),
        type: 'string',
        number_format: cell.numFmt ?? null,
      });
    }
  });

  return {
    source: 'header_row',
    columns,
  };
}
