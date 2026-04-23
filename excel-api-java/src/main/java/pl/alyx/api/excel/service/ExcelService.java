package pl.alyx.api.excel.service;

import org.apache.poi.ss.usermodel.*;
import org.apache.poi.ss.util.CellReference;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;
import pl.alyx.api.excel.dto.CellData;
import pl.alyx.api.excel.dto.RecordItem;
import pl.alyx.api.excel.dto.RecordListResponse;
import pl.alyx.api.excel.dto.SheetInfo;
import pl.alyx.api.excel.dto.SheetMetadata;

import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.*;

/**
 * Excel service for reading and writing Excel files.
 */
@Service
public class ExcelService {

    private static final DateTimeFormatter ISO_FORMATTER = DateTimeFormatter.ISO_INSTANT;

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
                throw new IllegalArgumentException("Sheet '" + sheetName + "' not found");
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

            return convertCell(cell, format);
        }
    }

    /**
     * Reads a range of cells from an Excel file.
     * @param filePath the path to the Excel file
     * @param sheetName the sheet name
     * @param rangeRef the range reference (e.g., "A1:C3")
     * @param format the output format
     * @return 2D array of cell data
     * @throws IOException if an I/O error occurs
     */
    public CellData[][] readRange(
            final String filePath,
            final String sheetName,
            final String rangeRef,
            final String format) throws IOException {
        try (FileInputStream fis = new FileInputStream(filePath);
             Workbook workbook = new XSSFWorkbook(fis)) {

            final Sheet sheet = workbook.getSheet(sheetName);
            if (sheet == null) {
                throw new IllegalArgumentException("Sheet '" + sheetName + "' not found");
            }

            final CellReference ref = new CellReference(rangeRef);
            final int firstRow = ref.getRow();
            final int firstCol = ref.getCol();

            final int lastRow = sheet.getLastRowNum();
            int lastCol = 0;

            // Find the last column
            for (int r = firstRow; r <= lastRow; r++) {
                final Row row = sheet.getRow(r);
                if (row != null && row.getLastCellNum() > lastCol) {
                    lastCol = row.getLastCellNum();
                }
            }

            final CellData[][] range = new CellData[lastRow - firstRow + 1][lastCol - firstCol + 1];

            for (int r = firstRow; r <= lastRow; r++) {
                final Row row = sheet.getRow(r);
                if (row != null) {
                    for (int c = firstCol; c <= lastCol; c++) {
                        final Cell cell = row.getCell(c);
                        if (cell != null) {
                            range[r - firstRow][c - firstCol] = convertCell(cell, format);
                        } else {
                            range[r - firstRow][c - firstCol] = new CellData("", "empty", null, false, null);
                        }
                    }
                }
            }

            return range;
        }
    }

    /**
     * Reads records from an Excel file.
     * @param filePath the path to the Excel file
     * @param sheetName the sheet name
     * @param headerRowCount the number of header rows
     * @param offset the offset for pagination
     * @param limit the limit for pagination
     * @param format the output format
     * @return the record list response
     * @throws IOException if an I/O error occurs
     */
    public RecordListResponse readRecords(
            final String filePath,
            final String sheetName,
            final int headerRowCount,
            final int offset,
            final int limit,
            final String format) throws IOException {
        try (FileInputStream fis = new FileInputStream(filePath);
             Workbook workbook = new XSSFWorkbook(fis)) {

            final Sheet sheet = workbook.getSheet(sheetName);
            if (sheet == null) {
                throw new IllegalArgumentException("Sheet '" + sheetName + "' not found");
            }

            final Row headerRow = sheet.getRow(headerRowCount);
            final List<String> headers = new ArrayList<>();

            for (final Cell cell : headerRow) {
                final String value = cell.getStringCellValue();
                if (!value.isEmpty()) {
                    headers.add(value);
                }
            }

            final int firstDataRow = headerRowCount + 1;
            final int lastRow = sheet.getLastRowNum();
            final int totalDataRows = Math.max(0, lastRow - headerRowCount);

            final int startRow = firstDataRow + offset;
            final int endRow = Math.min(startRow + limit - 1, lastRow);

            final List<RecordItem> items = new ArrayList<>();

            for (int r = startRow; r <= endRow; r++) {
                final Row row = sheet.getRow(r);
                if (row != null) {
                    final Map<String, Object> data = new HashMap<>();

                    for (int c = 0; c < headers.size(); c++) {
                        final Cell cell = row.getCell(c);
                        if (cell != null) {
                            data.put(headers.get(c), getCellValue(cell, format));
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
     * @param headerRowCount the number of header rows
     * @param format the output format
     * @return the record item
     * @throws IOException if an I/O error occurs
     */
    public RecordItem readRecord(
            final String filePath,
            final String sheetName,
            final int recordIndex,
            final int headerRowCount,
            final String format) throws IOException {
        try (FileInputStream fis = new FileInputStream(filePath);
             Workbook workbook = new XSSFWorkbook(fis)) {

            final Sheet sheet = workbook.getSheet(sheetName);
            if (sheet == null) {
                throw new IllegalArgumentException("Sheet '" + sheetName + "' not found");
            }

            final Row headerRow = sheet.getRow(headerRowCount);
            final List<String> headers = new ArrayList<>();

            for (final Cell cell : headerRow) {
                final String value = cell.getStringCellValue();
                if (!value.isEmpty()) {
                    headers.add(value);
                }
            }

            final int excelRowNumber = headerRowCount + recordIndex;
            final Row row = sheet.getRow(excelRowNumber);

            if (row == null) {
                throw new IllegalArgumentException("Record index " + recordIndex + " out of range");
            }

            final Map<String, Object> data = new HashMap<>();

            for (int c = 0; c < headers.size(); c++) {
                final Cell cell = row.getCell(c);
                if (cell != null) {
                    data.put(headers.get(c), getCellValue(cell, format));
                }
            }

            return new RecordItem(recordIndex, data);
        }
    }

    /**
     * Converts a cell to CellData.
     * @param cell the cell
     * @param format the output format
     * @return the cell data
     */
    private CellData convertCell(final Cell cell, final String format) {
        final Object value = getCellValue(cell, format);
        final String type = getCellType(cell);
        final String numberFormat = cell.getCellStyle().getDataFormatString();
        final boolean isFormula = cell.getCellType() == CellType.FORMULA;
        final String formatted = format.equals("display") ? cell.getStringCellValue() : null;

        return new CellData(value, type, numberFormat, isFormula, formatted);
    }

    /**
     * Gets the value of a cell.
     * @param cell the cell
     * @param format the output format
     * @return the cell value
     */
    private Object getCellValue(final Cell cell, final String format) {
        if (cell == null || cell.getCellType() == CellType.BLANK) {
            return "";
        }

        switch (cell.getCellType()) {
            case STRING:
                return cell.getStringCellValue();
            case NUMERIC:
                if (DateUtil.isCellDateFormatted(cell)) {
                    final Date date = cell.getDateCellValue();
                    return format.equals("string") ? ISO_FORMATTER.format(date.toInstant()) : date;
                }
                return cell.getNumericCellValue();
            case BOOLEAN:
                return cell.getBooleanCellValue();
            case FORMULA:
                return cell.getCellFormula();
            default:
                return "";
        }
    }

    /**
     * Gets the type of a cell.
     * @param cell the cell
     * @return the cell type
     */
    private String getCellType(final Cell cell) {
        if (cell == null || cell.getCellType() == CellType.BLANK) {
            return "empty";
        }

        switch (cell.getCellType()) {
            case STRING:
                return "string";
            case NUMERIC:
                return DateUtil.isCellDateFormatted(cell) ? "date" : "number";
            case BOOLEAN:
                return "boolean";
            case FORMULA:
                return "formula";
            default:
                return "empty";
        }
    }

    /**
     * Gets sheet metadata.
     * @param filePath the path to the Excel file
     * @param sheetName the sheet name
     * @return the sheet metadata
     * @throws IOException if an I/O error occurs
     */
    public SheetMetadata getSheetMetadata(final String filePath, final String sheetName) throws IOException {
        try (FileInputStream fis = new FileInputStream(filePath);
             Workbook workbook = new XSSFWorkbook(fis)) {

            final Sheet sheet = workbook.getSheet(sheetName);
            if (sheet == null) {
                throw new IllegalArgumentException("Sheet '" + sheetName + "' not found");
            }

            final int rowCount = sheet.getLastRowNum() + 1;
            int columnCount = 0;

            for (int r = 0; r <= sheet.getLastRowNum(); r++) {
                final Row row = sheet.getRow(r);
                if (row != null && row.getLastCellNum() > columnCount) {
                    columnCount = row.getLastCellNum();
                }
            }

            return new SheetMetadata(
                    sheetName,
                    rowCount,
                    columnCount,
                    "raw",
                    1,
                    2
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
    public List<Map<String, Object>> getColumnDefinitions(
            final String filePath,
            final String sheetName) throws IOException {
        try (FileInputStream fis = new FileInputStream(filePath);
             Workbook workbook = new XSSFWorkbook(fis)) {

            final Sheet sheet = workbook.getSheet(sheetName);
            if (sheet == null) {
                throw new IllegalArgumentException("Sheet '" + sheetName + "' not found");
            }

            final Row headerRow = sheet.getRow(0);
            final List<Map<String, Object>> columns = new ArrayList<>();

            if (headerRow != null) {
                for (final Cell cell : headerRow) {
                    if (cell.getStringCellValue() != null && !cell.getStringCellValue().isEmpty()) {
                        final Map<String, Object> column = new HashMap<>();
                        column.put("index", cell.getColumnIndex() + 1);
                        column.put("letter", cellReferenceAsString(cell.getColumnIndex(), 0));
                        column.put("id", cell.getStringCellValue());
                        column.put("type", "string");
                        column.put("number_format", cell.getCellStyle().getDataFormatString());
                        columns.add(column);
                    }
                }
            }

            return columns;
        }
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

            final Sheet sheet = workbook.getSheet(sheetName);
            if (sheet == null) {
                throw new IllegalArgumentException("Sheet '" + sheetName + "' not found");
            }

            final CellReference ref = new CellReference(cellRef);
            Row row = sheet.getRow(ref.getRow());
            if (row == null) {
                row = sheet.createRow(ref.getRow());
            }

            Cell cell = row.getCell(ref.getCol());
            if (cell == null) {
                cell = row.createCell(ref.getCol());
            }

            setCellValue(cell, value);

            try (FileOutputStream fos = new FileOutputStream(filePath)) {
                workbook.write(fos);
            }

            return convertCell(cell, "native");
        }
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
            final Integer afterRow,
            final Integer copyStyleFrom) throws IOException {
        try (FileInputStream fis = new FileInputStream(filePath);
             Workbook workbook = new XSSFWorkbook(fis)) {

            final Sheet sheet = workbook.getSheet(sheetName);
            if (sheet == null) {
                throw new IllegalArgumentException("Sheet '" + sheetName + "' not found");
            }

            final Row headerRow = sheet.getRow(0);
            final List<String> headers = new ArrayList<>();
            for (final Cell cell : headerRow) {
                if (cell.getStringCellValue() != null && !cell.getStringCellValue().isEmpty()) {
                    headers.add(cell.getStringCellValue());
                }
            }

            final int newRowNumber = afterRow != null ? afterRow + 1 : sheet.getLastRowNum() + 1;
            final Row newRow = sheet.createRow(newRowNumber);

            if (copyStyleFrom != null) {
                final Row styleRow = sheet.getRow(copyStyleFrom);
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

            for (int i = 0; i < headers.size(); i++) {
                final String header = headers.get(i);
                if (data.containsKey(header)) {
                    Cell cell = newRow.getCell(i);
                    if (cell == null) {
                        cell = newRow.createCell(i);
                    }
                    setCellValue(cell, data.get(header));
                }
            }

            try (FileOutputStream fos = new FileOutputStream(filePath)) {
                workbook.write(fos);
            }

            final int recordIndex = newRowNumber;
            return new RecordItem(recordIndex, data);
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
            final Map<String, Object> data) throws IOException {
        try (FileInputStream fis = new FileInputStream(filePath);
             Workbook workbook = new XSSFWorkbook(fis)) {

            final Sheet sheet = workbook.getSheet(sheetName);
            if (sheet == null) {
                throw new IllegalArgumentException("Sheet '" + sheetName + "' not found");
            }

            final Row headerRow = sheet.getRow(0);
            final List<String> headers = new ArrayList<>();
            for (final Cell cell : headerRow) {
                if (cell.getStringCellValue() != null && !cell.getStringCellValue().isEmpty()) {
                    headers.add(cell.getStringCellValue());
                }
            }

            final int excelRowNumber = recordIndex + 1;
            final Row row = sheet.getRow(excelRowNumber);
            if (row == null) {
                throw new IllegalArgumentException("Record index " + recordIndex + " out of range");
            }

            for (int i = 0; i < headers.size(); i++) {
                final String header = headers.get(i);
                if (data.containsKey(header)) {
                    Cell cell = row.getCell(i);
                    if (cell == null) {
                        cell = row.createCell(i);
                    }
                    setCellValue(cell, data.get(header));
                }
            }

            try (FileOutputStream fos = new FileOutputStream(filePath)) {
                workbook.write(fos);
            }

            return new RecordItem(recordIndex, data);
        }
    }

    /**
     * Deletes a record from an Excel file.
     * @param filePath the path to the Excel file
     * @param sheetName the sheet name
     * @param recordIndex the record index (1-based)
     * @throws IOException if an I/O error occurs
     */
    public void deleteRecord(final String filePath, final String sheetName, final int recordIndex) throws IOException {
        try (FileInputStream fis = new FileInputStream(filePath);
             Workbook workbook = new XSSFWorkbook(fis)) {

            final Sheet sheet = workbook.getSheet(sheetName);
            if (sheet == null) {
                throw new IllegalArgumentException("Sheet '" + sheetName + "' not found");
            }

            final int excelRowNumber = recordIndex + 1;
            sheet.removeRow(sheet.getRow(excelRowNumber));
            sheet.shiftRows(excelRowNumber + 1, sheet.getLastRowNum(), -1);

            try (FileOutputStream fos = new FileOutputStream(filePath)) {
                workbook.write(fos);
            }
        }
    }

    /**
     * Sets the value of a cell.
     * @param cell the cell
     * @param value the value
     */
    private void setCellValue(final Cell cell, final Object value) {
        if (value == null) {
            cell.setBlank();
        } else if (value instanceof String) {
            cell.setCellValue((String) value);
        } else if (value instanceof Number) {
            cell.setCellValue(((Number) value).doubleValue());
        } else if (value instanceof Boolean) {
            cell.setCellValue((Boolean) value);
        } else if (value instanceof java.util.Date) {
            cell.setCellValue((java.util.Date) value);
        } else {
            cell.setCellValue(value.toString());
        }
    }
}
