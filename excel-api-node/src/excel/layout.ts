// Sheet header layout resolution — shared by record/column paths.
// Canonical semantics (all implementations):
//   record index is 1-based; record N lives at row `firstDataRow + N - 1`.
//   single (default): column ids on `identifier_row` (default 1).
//   multi: ids on `identifier_row`, types on `type_row`, descriptions on
//     `description_row`; data starts after the last configured header row.
//   legend: column ids come from `legend_sheet` (rows: letter,id,type,description
//     starting at row 1); data starts at `identifier_row + 1` when set, else 1.
//   none: no header; record data is keyed by column letters; data starts at row 1.

import ExcelJS from 'exceljs';
import type { SheetHeaderConfig } from '../config/types.js';

export interface SheetLayout {
  mode: 'single' | 'multi' | 'legend' | 'none';
  identifierRow: number; // 0 when mode === 'none'
  typeRow: number;
  descriptionRow: number;
  legendSheet?: string;
  firstDataRow: number;
}

export function resolveSheetLayout(config?: SheetHeaderConfig): SheetLayout {
  const mode = config?.mode ?? 'single';
  const identifierRow = mode === 'none' ? 0 : (config?.identifier_row ?? 1);
  const typeRow = config?.type_row ?? 0;
  const descriptionRow = config?.description_row ?? 0;

  let firstDataRow: number;
  if (mode === 'none') {
    firstDataRow = 1;
  } else if (mode === 'legend') {
    firstDataRow = identifierRow + 1;
  } else {
    firstDataRow = Math.max(identifierRow, typeRow, descriptionRow) + 1;
  }

  const layout: SheetLayout = { mode, identifierRow, typeRow, descriptionRow, firstDataRow };
  if (config?.legend_sheet) {
    layout.legendSheet = config.legend_sheet;
  }
  return layout;
}

function colLetter(colIndex: number): string {
  let letter = '';
  let n = colIndex;
  while (n > 0) {
    n--;
    letter = String.fromCharCode(65 + (n % 26)) + letter;
    n = Math.floor(n / 26);
  }
  return letter;
}

function cellText(value: ExcelJS.CellValue | null | undefined): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'object') {
    if ('text' in value && value.text) return String(value.text);
    if ('richText' in value && Array.isArray(value.richText)) {
      return value.richText.map((t) => t.text).join('');
    }
    if ('result' in value && value.result !== undefined) return String(value.result);
    if ('formula' in value) return String(value.formula);
    return String(value);
  }
  return String(value);
}

function readRowCells(row: ExcelJS.Row): string[] {
  const cells: string[] = [];
  row.eachCell({ includeEmpty: false }, (cell, colNumber) => {
    const text = cellText(cell.value);
    if (text !== '') {
      cells[colNumber - 1] = text;
    }
  });
  return cells;
}

// Column ids for a sheet: identifier row for single/multi, legend sheet for
// legend mode, column letters for none mode.
export function resolveColumnIds(
  workbook: ExcelJS.Workbook,
  sheet: ExcelJS.Worksheet,
  layout: SheetLayout
): string[] {
  if (layout.mode === 'none') {
    const ids: string[] = [];
    for (let c = 1; c <= (sheet.columnCount as number); c++) {
      ids.push(colLetter(c));
    }
    return ids;
  }

  if (layout.mode === 'legend') {
    const legendName = layout.legendSheet;
    if (!legendName) {
      throw new Error(`Sheet '${sheet.name}' is in legend mode but legend_sheet is not configured`);
    }
    const legend = workbook.getWorksheet(legendName);
    if (!legend) {
      throw new Error(`Legend sheet '${legendName}' is not configured`);
    }
    const ids: string[] = [];
    for (let r = 1; r <= legend.rowCount; r++) {
      const cells = readRowCells(legend.getRow(r));
      if (cells.length === 0) continue;
      const letter = cells[0];
      const id = cells[1] ?? letter;
      const colIndex = columnIndexFromLetter(letter);
      if (colIndex > 0 && id) {
        ids[colIndex - 1] = id;
      }
    }
    return ids;
  }

  return readRowCells(sheet.getRow(layout.identifierRow));
}

export function columnIndexFromLetter(letter: string): number {
  let index = 0;
  for (const ch of letter.toUpperCase()) {
    if (ch < 'A' || ch > 'Z') return -1;
    index = index * 26 + (ch.charCodeAt(0) - 64);
  }
  return index;
}

export { colLetter };
