package pl.alyx.api.excel.service;

import org.apache.poi.ss.usermodel.*;
import org.apache.poi.ss.util.AreaReference;
import org.apache.poi.ss.util.CellReference;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;
import pl.alyx.api.excel.config.WorkbookConfig;
import pl.alyx.api.excel.dto.CellData;
import pl.alyx.api.excel.dto.RecordItem;
import pl.alyx.api.excel.dto.RecordListResponse;
import pl.alyx.api.excel.dto.SheetInfo;
import pl.alyx.api.excel.dto.SheetMetadata;
import pl.alyx.api.excel.dto.RangeData;
import pl.alyx.api.excel.exception.RowNotFoundException;
import pl.alyx.api.excel.exception.SheetNotConfiguredException;
import pl.alyx.api.excel.exception.SheetNotFoundException;
import pl.alyx.api.excel.exception.ValidationException;

import pl.alyx.api.excel.service.support.CellConverter;

import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.util.*;

/**
 * Excel service for reading and writing Excel files.
 */
@Service
public class ExcelService {

    private static final DataFormatter DATA_FORMATTER = new DataFormatter();

    /**
     * Reads sheet names from an Excel file.
     * @param filePath the path to the Excel file
     * @return list of sheet information
     * @throws IOException if an I/O error occurs
     */
    public List<SheetInfo> readSheetNames(final String filePath) throws IOException {
        try (FileInputStream fis = new FileInputStream(filePath);
             Workbook workbook = new XSSFWorkbook(fis)) {

            final List<SheetInfo> sheets = new ArrayList<>();
            for (int i = 0; i < workbook.getNumberOfSheets(); i++) {
                final Sheet sheet = workbook.getSheetAt(i);
                // 1-based indexing
                sheets.add(new SheetInfo(sheet.getSheetName(), i + 1));
            }
            return sheets;
        }
    }

    /**
     * Reads a single cell from an Excel file.
     * @param filePath the path to the Excel file
     * @param sheetName the sheet name
     * @param cellRef the cell reference (e.g., "A1")
     * @param format the output format
     * @return the cell data
     * @throws IOException if an I/O error occurs
     */
    public CellData readCell(
            final String filePath,
            final String sheetName,
            final String cellRef,
            final String format) throws IOException {
        try (FileInputStream fis = new FileInputStream(filePath);
             Workbook workbook = new XSSFWorkbook(fis)) {

            final Sheet sheet = workbook.getSheet(sheetName);
            if (sheet == null) {
                throw new SheetNotFoundException(sheetName);
            }

            final CellReference ref = new CellReference(cellRef);
            final Row row = sheet.getRow(ref.getRow());
            if (row == null) {
                return new CellData("", "empty", null, false, null);
            }

            final Cell cell = row.getCell(ref.getCol());
            if (cell == null) {
                return new CellData("", "empty", null, false, null);
            }

            return CellConverter.convertCell(cell, format);
        }
    }

    /**
     * Reads a range of cells from an Excel file.
     * @param filePath the path to the Excel file
     * @param sheetName the sheet name
     * @param rangeRef the range reference (e.g., "A1:C3")
     * @param format the output format
     * @return range data envelope with per-row cell payloads
     * @throws IOException if an I/O error occurs
     */
    public RangeData readRange(
            final String filePath,
            final String sheetName,
            final String rangeRef,
            final String format) throws IOException {
        try (FileInputStream fis = new FileInputStream(filePath);
             Workbook workbook = new XSSFWorkbook(fis)) {

            final Sheet sheet = workbook.getSheet(sheetName);
            if (sheet == null) {
                throw new SheetNotFoundException(sheetName);
            }

            final AreaReference area = new AreaReference(rangeRef, workbook.getSpreadsheetVersion());
            final CellReference firstCell = area.getFirstCell();
            final CellReference lastCell = area.getLastCell();
            final int firstRow = firstCell.getRow();
            final int firstCol = firstCell.getCol();
            final int lastRow = lastCell.getRow();
            final int lastCol = lastCell.getCol();

            final List<RangeData.RangeRow> rows = new ArrayList<>();

            for (int r = firstRow; r <= lastRow; r++) {
                final Row row = sheet.getRow(r);
                final List<CellData> cells = new ArrayList<>();
                for (int c = firstCol; c <= lastCol; c++) {
                    final Cell cell = row == null ? null : row.getCell(c);
                    cells.add(cell != null
                            ? CellConverter.convertCell(cell, format)
                            : CellConverter.emptyCell(r, c));
                }
                rows.add(new RangeData.RangeRow(r + 1, cells));
            }

            return new RangeData(rangeRef, rows);
        }
    }

    /**
     * Reads records from an Excel file.
     * @param filePath the path to the Excel file
     * @param sheetName the sheet name
     * @param sheetConfig the per-sheet header configuration (null = single mode)
     * @param offset the offset for pagination
     * @param limit the limit for pagination
     * @param format the output format
     * @return the record list response
     * @throws IOException if an I/O error occurs
     */
    public RecordListResponse readRecords(
            final String filePath,
            final String sheetName,
            final WorkbookConfig.SheetHeaderConfig sheetConfig,
            final int offset,
            final int limit,
            final String format) throws IOException {
        try (FileInputStream fis = new FileInputStream(filePath);
             Workbook workbook = new XSSFWorkbook(fis)) {

            final Sheet sheet = workbook.getSheet(sheetName);
            if (sheet == null) {
                throw new SheetNotFoundException(sheetName);
            }

            final SheetLayout layout = SheetLayout.resolve(sheetConfig);
            final String[] headers = resolveColumnIds(workbook, sheet, layout);

            final int firstDataRowPoi = layout.getFirstDataRowPoi();
            final int lastRow = sheet.getLastRowNum();
            final int totalDataRows = Math.max(0, lastRow - firstDataRowPoi + 1);

            final int startRow = firstDataRowPoi + offset;
            final int endRow = Math.min(startRow + limit - 1, lastRow);

            final List<RecordItem> items = new ArrayList<>();

            for (int r = startRow; r <= endRow; r++) {
                final Row row = sheet.getRow(r);
                if (row != null) {
                    final Map<String, Object> data = new HashMap<>();

                    for (int c = 0; c < headers.length; c++) {
                        final String header = headers[c];
                        if (header == null || header.isEmpty()) {
                            continue;
                        }
                        final Cell cell = row.getCell(c);
                        if (cell != null) {
                            data.put(header, CellConverter.getCellValue(cell, format));
                        }
                    }

                    // 1-based record index
                    final int recordIndex = offset + (r - startRow) + 1;
                    items.add(new RecordItem(recordIndex, data));
                }
            }

            return new RecordListResponse(items, totalDataRows, offset, limit, format);
        }
    }

    /**
     * Reads a single record from an Excel file.
     * @param filePath the path to the Excel file
     * @param sheetName the sheet name
     * @param recordIndex the record index (1-based)
     * @param sheetConfig the per-sheet header configuration (null = single mode)
     * @param format the output format
     * @return the record item
     * @throws IOException if an I/O error occurs
     */
    public RecordItem readRecord(
            final String filePath,
            final String sheetName,
            final int recordIndex,
            final WorkbookConfig.SheetHeaderConfig sheetConfig,
            final String format) throws IOException {
        try (FileInputStream fis = new FileInputStream(filePath);
             Workbook workbook = new XSSFWorkbook(fis)) {

            final Sheet sheet = workbook.getSheet(sheetName);
            if (sheet == null) {
                throw new SheetNotFoundException(sheetName);
            }

            final SheetLayout layout = SheetLayout.resolve(sheetConfig);
            final String[] headers = resolveColumnIds(workbook, sheet, layout);

            final int excelRowNumber = layout.getFirstDataRowPoi() + recordIndex - 1;
            final Row row = recordIndex < 1 ? null : sheet.getRow(excelRowNumber);

            if (row == null) {
                throw new RowNotFoundException(recordIndex);
            }

            final Map<String, Object> data = new HashMap<>();

            for (int c = 0; c < headers.length; c++) {
                final String header = headers[c];
                if (header == null || header.isEmpty()) {
                    continue;
                }
                final Cell cell = row.getCell(c);
                if (cell != null) {
                    data.put(header, CellConverter.getCellValue(cell, format));
                }
            }

            return new RecordItem(recordIndex, data);
        }
    }

    /**
     * Gets sheet metadata.
     * @param filePath the path to the Excel file
     * @param sheetName the sheet name
     * @return the sheet metadata
     * @throws IOException if an I/O error occurs
     */
    public SheetMetadata getSheetMetadata(
            final String filePath,
            final String sheetName,
            final WorkbookConfig.SheetHeaderConfig sheetConfig) throws IOException {
        try (FileInputStream fis = new FileInputStream(filePath);
             Workbook workbook = new XSSFWorkbook(fis)) {

            final Sheet sheet = workbook.getSheet(sheetName);
            if (sheet == null) {
                throw new SheetNotFoundException(sheetName);
            }

            final int rowCount = sheet.getLastRowNum() + 1;
            int columnCount = 0;

            for (int r = 0; r <= sheet.getLastRowNum(); r++) {
                final Row row = sheet.getRow(r);
                if (row != null && row.getLastCellNum() > columnCount) {
                    columnCount = row.getLastCellNum();
                }
            }

            final SheetLayout layout = SheetLayout.resolve(sheetConfig);
            return new SheetMetadata(
                    sheetName,
                    rowCount,
                    columnCount,
                    SheetLayout.MODE_NONE.equals(layout.getMode()) ? "raw" : "table",
                    layout.getIdentifierRow(),
                    layout.getFirstDataRow()
            );
        }
    }

    /**
     * Gets column definitions.
     * @param filePath the path to the Excel file
     * @param sheetName the sheet name
     * @return list of column definitions
     * @throws IOException if an I/O error occurs
     */
    public Map<String, Object> getColumnDefinitions(
            final String filePath,
            final String sheetName,
            final WorkbookConfig.SheetHeaderConfig sheetConfig) throws IOException {
        try (FileInputStream fis = new FileInputStream(filePath);
             Workbook workbook = new XSSFWorkbook(fis)) {

            final Sheet sheet = workbook.getSheet(sheetName);
            if (sheet == null) {
                throw new SheetNotFoundException(sheetName);
            }

            final SheetLayout layout = SheetLayout.resolve(sheetConfig);
            final String[] ids = resolveColumnIds(workbook, sheet, layout);
            final List<Map<String, Object>> columns = new ArrayList<>();

            final Row typeRow = layout.getTypeRow() > 0
                    ? sheet.getRow(layout.getTypeRow() - 1) : null;
            final Row descriptionRow = layout.getDescriptionRow() > 0
                    ? sheet.getRow(layout.getDescriptionRow() - 1) : null;

            for (int c = 0; c < ids.length; c++) {
                final String id = ids[c];
                if (id == null || id.isEmpty()) {
                    continue;
                }
                final Map<String, Object> column = new HashMap<>();
                column.put("index", c + 1);
                column.put("letter", cellReferenceAsString(c + 1, 0));
                column.put("id", id);
                final String type = typeRow != null ? cellText(typeRow.getCell(c)) : "";
                column.put("type", !type.isEmpty() ? type : "string");
                column.put("number_format", null);
                final String description = descriptionRow != null
                        ? cellText(descriptionRow.getCell(c)) : "";
                if (!description.isEmpty()) {
                    column.put("descriptions", Map.of("default", description));
                }
                columns.add(column);
            }

            final String source;
            if (SheetLayout.MODE_LEGEND.equals(layout.getMode())) {
                source = "legend_sheet";
            } else if (SheetLayout.MODE_MULTI.equals(layout.getMode())) {
                source = "multi_row";
            } else {
                source = "header_row";
            }

            final Map<String, Object> result = new HashMap<>();
            result.put("source", source);
            result.put("columns", columns);
            return result;
        }
    }

    private String cellText(final Cell cell) {
        if (cell == null) {
            return "";
        }
        return DATA_FORMATTER.formatCellValue(cell);
    }

    /**
     * Resolves column ids: identifier row for single/multi, legend sheet for
     * legend mode, column letters for none mode. Returns a column-indexed
     * array (index 0 = column A) with nulls for unmapped columns.
     */
    private String[] resolveColumnIds(
            final Workbook workbook,
            final Sheet sheet,
            final SheetLayout layout) {
        if (SheetLayout.MODE_NONE.equals(layout.getMode())) {
            int columnCount = 0;
            for (int r = 0; r <= sheet.getLastRowNum(); r++) {
                final Row row = sheet.getRow(r);
                if (row != null && row.getLastCellNum() > columnCount) {
                    columnCount = row.getLastCellNum();
                }
            }
            final String[] ids = new String[columnCount];
            for (int c = 0; c < columnCount; c++) {
                ids[c] = cellReferenceAsString(c + 1, 0);
            }
            return ids;
        }

        if (SheetLayout.MODE_LEGEND.equals(layout.getMode())) {
            final String legendName = layout.getLegendSheet();
            if (legendName == null || legendName.isEmpty()) {
                throw new SheetNotConfiguredException(sheet.getSheetName(),
                        "Sheet '" + sheet.getSheetName()
                                + "' is in legend mode but legend_sheet is not configured");
            }
            final Sheet legend = workbook.getSheet(legendName);
            if (legend == null) {
                throw new SheetNotConfiguredException(sheet.getSheetName(),
                        "Legend sheet '" + legendName + "' not found");
            }
            int maxCol = 0;
            final Map<Integer, String> byColumn = new HashMap<>();
            for (int r = 0; r <= legend.getLastRowNum(); r++) {
                final Row row = legend.getRow(r);
                if (row == null) {
                    continue;
                }
                final String letter = cellText(row.getCell(0));
                final String id = cellText(row.getCell(1));
                if (letter.isEmpty()) {
                    continue;
                }
                final int colIndex = columnIndexFromLetter(letter.isEmpty() ? id : letter);
                if (colIndex > 0 && !id.isEmpty()) {
                    byColumn.put(colIndex - 1, id);
                    maxCol = Math.max(maxCol, colIndex);
                }
            }
            final String[] ids = new String[maxCol];
            byColumn.forEach((c, id) -> ids[c] = id);
            return ids;
        }

        final Row headerRow = sheet.getRow(layout.getIdentifierRow() - 1);
        if (headerRow == null) {
            return new String[0];
        }
        final String[] ids = new String[Math.max(0, headerRow.getLastCellNum())];
        for (int c = 0; c < ids.length; c++) {
            ids[c] = cellText(headerRow.getCell(c));
        }
        return ids;
    }

    private int columnIndexFromLetter(final String letter) {
        int index = 0;
        for (final char ch : letter.toUpperCase().toCharArray()) {
            if (ch < 'A' || ch > 'Z') {
                return -1;
            }
            index = index * 26 + (ch - 'A' + 1);
        }
        return index;
    }

    /**
     * Converts column index to letter reference.
     * @param col the column index
     * @param row the row index
     * @return the cell reference string
     */
    private String cellReferenceAsString(final int col, final int row) {
        int dividend = col;
        final StringBuilder columnLabel = new StringBuilder();
        while (dividend > 0) {
            final int modulo = (dividend - 1) % 26;
            columnLabel.insert(0, (char) (65 + modulo));
            dividend = (dividend - modulo) / 26;
        }
        return columnLabel.toString();
    }

    /**
     * Writes a cell value.
     * @param filePath the path to the Excel file
     * @param sheetName the sheet name
     * @param cellRef the cell reference
     * @param value the value to write
     * @return the cell data
     * @throws IOException if an I/O error occurs
     */
    public CellData writeCell(
            final String filePath,
            final String sheetName,
            final String cellRef,
            final Object value) throws IOException {
        try (FileInputStream fis = new FileInputStream(filePath);
             Workbook workbook = new XSSFWorkbook(fis)) {

            final CellData cellData = applyWriteCell(getSheetOrThrow(workbook, sheetName), cellRef, value);

            try (FileOutputStream fos = new FileOutputStream(filePath)) {
                workbook.write(fos);
            }

            return cellData;
        }
    }

    private Sheet getSheetOrThrow(final Workbook workbook, final String sheetName) {
        final Sheet sheet = workbook.getSheet(sheetName);
        if (sheet == null) {
            throw new SheetNotFoundException(sheetName);
        }
        return sheet;
    }

    private CellData applyWriteCell(final Sheet sheet, final String cellRef, final Object value) {
        final CellReference ref = new CellReference(cellRef);
        Row row = sheet.getRow(ref.getRow());
        if (row == null) {
            row = sheet.createRow(ref.getRow());
        }

        Cell cell = row.getCell(ref.getCol());
        if (cell == null) {
            cell = row.createCell(ref.getCol());
        }

        CellConverter.setCellValue(cell, value);
        return CellConverter.convertCell(cell, "native");
    }

    private CellData applyClearCell(final Sheet sheet, final String cellRef) {
        return applyWriteCell(sheet, cellRef, null);
    }

    private RecordItem applyAddRecord(
            final Sheet sheet,
            final Map<String, Object> data,
            final SheetLayout layout,
            final String[] headers,
            final Integer afterRow,
            final Integer copyStyleFrom) {
        final int firstDataRowPoi = layout.getFirstDataRowPoi();
        if (afterRow != null && afterRow < 0) {
            throw new RowNotFoundException(afterRow);
        }
        final int newRowNumber = afterRow != null
                ? firstDataRowPoi + afterRow
                : sheet.getLastRowNum() + 1;
        if (afterRow != null && newRowNumber <= sheet.getLastRowNum()) {
            sheet.shiftRows(newRowNumber, sheet.getLastRowNum(), 1);
        }
        final Row newRow = sheet.createRow(newRowNumber);

        if (copyStyleFrom != null) {
            final Row styleRow = sheet.getRow(firstDataRowPoi + copyStyleFrom - 1);
            if (styleRow != null) {
                for (int c = 0; c < styleRow.getLastCellNum(); c++) {
                    final Cell styleCell = styleRow.getCell(c);
                    if (styleCell != null) {
                        final Cell targetCell = newRow.createCell(c);
                        targetCell.setCellStyle(styleCell.getCellStyle());
                    }
                }
            }
        }

        for (int i = 0; i < headers.length; i++) {
            final String header = headers[i];
            if (header != null && data.containsKey(header)) {
                Cell cell = newRow.getCell(i);
                if (cell == null) {
                    cell = newRow.createCell(i);
                }
                CellConverter.setCellValue(cell, data.get(header));
            }
        }

        return new RecordItem(newRowNumber - firstDataRowPoi + 1, data);
    }

    private RecordItem applyUpdateRecord(
            final Sheet sheet,
            final int recordIndex,
            final Map<String, Object> data,
            final SheetLayout layout,
            final String[] headers) {
        final int excelRowNumber = layout.getFirstDataRowPoi() + recordIndex - 1;
        final Row row = recordIndex < 1 ? null : sheet.getRow(excelRowNumber);
        if (row == null) {
            throw new RowNotFoundException(recordIndex);
        }

        for (int i = 0; i < headers.length; i++) {
            final String header = headers[i];
            if (header != null && data.containsKey(header)) {
                Cell cell = row.getCell(i);
                if (cell == null) {
                    cell = row.createCell(i);
                }
                CellConverter.setCellValue(cell, data.get(header));
            }
        }

        return new RecordItem(recordIndex, data);
    }

    private void applyDeleteRecord(
            final Sheet sheet,
            final int recordIndex,
            final SheetLayout layout) {
        final int excelRowNumber = layout.getFirstDataRowPoi() + recordIndex - 1;
        final Row row = recordIndex < 1 ? null : sheet.getRow(excelRowNumber);
        if (row == null) {
            throw new RowNotFoundException(recordIndex);
        }
        sheet.removeRow(row);
        sheet.shiftRows(excelRowNumber + 1, sheet.getLastRowNum(), -1);
    }

    /**
     * Adds a record to an Excel file.
     * @param filePath the path to the Excel file
     * @param sheetName the sheet name
     * @param data the record data
     * @param afterRow the row number after which to add the record (optional)
     * @param copyStyleFrom the row number from which to copy the style (optional)
     * @return the record item
     * @throws IOException if an I/O error occurs
     */
    public RecordItem addRecord(
            final String filePath,
            final String sheetName,
            final Map<String, Object> data,
            final WorkbookConfig.SheetHeaderConfig sheetConfig,
            final Integer afterRow,
            final Integer copyStyleFrom) throws IOException {
        try (FileInputStream fis = new FileInputStream(filePath);
             Workbook workbook = new XSSFWorkbook(fis)) {

            final Sheet sheet = getSheetOrThrow(workbook, sheetName);
            final SheetLayout layout = SheetLayout.resolve(sheetConfig);
            final RecordItem record = applyAddRecord(
                    sheet, data, layout, resolveColumnIds(workbook, sheet, layout), afterRow, copyStyleFrom);

            try (FileOutputStream fos = new FileOutputStream(filePath)) {
                workbook.write(fos);
            }

            return record;
        }
    }

    /**
     * Updates a record in an Excel file.
     * @param filePath the path to the Excel file
     * @param sheetName the sheet name
     * @param recordIndex the record index (1-based)
     * @param data the record data
     * @return the record item
     * @throws IOException if an I/O error occurs
     */
    public RecordItem updateRecord(
            final String filePath,
            final String sheetName,
            final int recordIndex,
            final Map<String, Object> data,
            final WorkbookConfig.SheetHeaderConfig sheetConfig) throws IOException {
        try (FileInputStream fis = new FileInputStream(filePath);
             Workbook workbook = new XSSFWorkbook(fis)) {

            final Sheet sheet = getSheetOrThrow(workbook, sheetName);
            final SheetLayout layout = SheetLayout.resolve(sheetConfig);
            final RecordItem record = applyUpdateRecord(
                    sheet, recordIndex, data, layout, resolveColumnIds(workbook, sheet, layout));

            try (FileOutputStream fos = new FileOutputStream(filePath)) {
                workbook.write(fos);
            }

            return record;
        }
    }

    /**
     * Deletes a record from an Excel file.
     * @param filePath the path to the Excel file
     * @param sheetName the sheet name
     * @param recordIndex the record index (1-based)
     * @throws IOException if an I/O error occurs
     */
    public void deleteRecord(
            final String filePath,
            final String sheetName,
            final int recordIndex,
            final WorkbookConfig.SheetHeaderConfig sheetConfig) throws IOException {
        try (FileInputStream fis = new FileInputStream(filePath);
             Workbook workbook = new XSSFWorkbook(fis)) {

            final SheetLayout layout = SheetLayout.resolve(sheetConfig);
            applyDeleteRecord(getSheetOrThrow(workbook, sheetName), recordIndex, layout);

            try (FileOutputStream fos = new FileOutputStream(filePath)) {
                workbook.write(fos);
            }
        }
    }

    /**
     * Applies a batch of cell operations within a single open/save cycle.
     * @param filePath the path to the Excel file
     * @param sheetName the sheet name
     * @param operations the batch operations (op: update|clear, ref, value)
     * @return per-operation results with op, status, and optional error entries
     * @throws IOException if an I/O error occurs
     */
    public List<Map<String, Object>> batchCellOperations(
            final String filePath,
            final String sheetName,
            final List<Map<String, Object>> operations) throws IOException {
        try (FileInputStream fis = new FileInputStream(filePath);
             Workbook workbook = new XSSFWorkbook(fis)) {

            final Sheet sheet = getSheetOrThrow(workbook, sheetName);
            final List<Map<String, Object>> results = new ArrayList<>();

            for (final Map<String, Object> operation : operations) {
                final Map<String, Object> entry = new HashMap<>();
                final String op = String.valueOf(operation.getOrDefault("op", "update"));
                entry.put("op", op);
                try {
                    final String ref = (String) operation.get("ref");
                    if ("clear".equals(op)) {
                        applyClearCell(sheet, ref);
                    } else if ("update".equals(op)) {
                        applyWriteCell(sheet, ref, operation.get("value"));
                    } else {
                        throw new ValidationException("Unsupported cell operation '" + op + "'");
                    }
                    entry.put("status", "ok");
                } catch (RuntimeException e) {
                    entry.put("status", "error");
                    entry.put("error", e.getMessage());
                }
                results.add(entry);
            }

            if (results.stream().anyMatch(r -> "ok".equals(r.get("status")))) {
                try (FileOutputStream fos = new FileOutputStream(filePath)) {
                    workbook.write(fos);
                }
            }

            return results;
        }
    }

    /**
     * Applies a batch of record operations within a single open/save cycle.
     * @param filePath the path to the Excel file
     * @param sheetName the sheet name
     * @param operations the batch operations (op: add|update|delete, row_index, data, copy_style_from)
     * @param sheetConfig the per-sheet header configuration (null = single mode)
     * @return per-operation results with op, status, index, and optional error entries
     * @throws IOException if an I/O error occurs
     */
    public List<Map<String, Object>> batchRecordOperations(
            final String filePath,
            final String sheetName,
            final List<Map<String, Object>> operations,
            final WorkbookConfig.SheetHeaderConfig sheetConfig) throws IOException {
        try (FileInputStream fis = new FileInputStream(filePath);
             Workbook workbook = new XSSFWorkbook(fis)) {

            final Sheet sheet = getSheetOrThrow(workbook, sheetName);
            final SheetLayout layout = SheetLayout.resolve(sheetConfig);
            final String[] headers = resolveColumnIds(workbook, sheet, layout);
            final List<Map<String, Object>> results = new ArrayList<>();

            for (final Map<String, Object> operation : operations) {
                final Map<String, Object> entry = new HashMap<>();
                final String op = String.valueOf(operation.getOrDefault("op", ""));
                entry.put("op", op);
                try {
                    final Integer rowIndex = operation.get("row_index") instanceof Number
                            ? ((Number) operation.get("row_index")).intValue() : null;
                    switch (op) {
                        case "add": {
                            final RecordItem item = applyAddRecord(
                                    sheet,
                                    castToDataMap(operation.get("data")),
                                    layout,
                                    headers,
                                    rowIndex,
                                    operation.get("copy_style_from") instanceof Number
                                            ? ((Number) operation.get("copy_style_from")).intValue() : null);
                            entry.put("status", "ok");
                            entry.put("index", item.getIndex());
                            break;
                        }
                        case "update": {
                            if (rowIndex == null) {
                                throw new ValidationException("update operation requires row_index");
                            }
                            applyUpdateRecord(sheet, rowIndex, castToDataMap(operation.get("data")), layout, headers);
                            entry.put("status", "ok");
                            entry.put("index", rowIndex);
                            break;
                        }
                        case "delete": {
                            if (rowIndex == null) {
                                throw new ValidationException("delete operation requires row_index");
                            }
                            applyDeleteRecord(sheet, rowIndex, layout);
                            entry.put("status", "ok");
                            entry.put("index", rowIndex);
                            break;
                        }
                        default:
                            throw new ValidationException("Unsupported record operation '" + op + "'");
                    }
                } catch (RuntimeException e) {
                    entry.put("status", "error");
                    entry.put("error", e.getMessage());
                }
                results.add(entry);
            }

            if (results.stream().anyMatch(r -> "ok".equals(r.get("status")))) {
                try (FileOutputStream fos = new FileOutputStream(filePath)) {
                    workbook.write(fos);
                }
            }

            return results;
        }
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> castToDataMap(final Object data) {
        if (data instanceof Map) {
            return (Map<String, Object>) data;
        }
        return new HashMap<>();
    }

}
