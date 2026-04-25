package pl.alyx.api.excel.service.support;

import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellType;
import org.apache.poi.ss.usermodel.DateUtil;
import pl.alyx.api.excel.dto.CellData;

import java.time.format.DateTimeFormatter;
import java.util.Date;

public final class CellConverter {

    private static final DateTimeFormatter ISO_FORMATTER = DateTimeFormatter.ISO_INSTANT;

    private CellConverter() {
    }

    public static CellData convertCell(final Cell cell, final String format) {
        final Object value = getCellValue(cell, format);
        final String type = getCellType(cell);
        final String numberFormat = cell.getCellStyle().getDataFormatString();
        final boolean isFormula = cell.getCellType() == CellType.FORMULA;
        final String formatted = "display".equals(format) ? cell.getStringCellValue() : null;
        return new CellData(value, type, numberFormat, isFormula, formatted);
    }

    public static Object getCellValue(final Cell cell, final String format) {
        if (cell == null || cell.getCellType() == CellType.BLANK) {
            return "";
        }
        switch (cell.getCellType()) {
            case STRING:
                return cell.getStringCellValue();
            case NUMERIC:
                if (DateUtil.isCellDateFormatted(cell)) {
                    final Date date = cell.getDateCellValue();
                    return "string".equals(format) ? ISO_FORMATTER.format(date.toInstant()) : date;
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

    public static String getCellType(final Cell cell) {
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

    public static void setCellValue(final Cell cell, final Object value) {
        if (value == null) {
            cell.setBlank();
        } else if (value instanceof String) {
            cell.setCellValue((String) value);
        } else if (value instanceof Number) {
            cell.setCellValue(((Number) value).doubleValue());
        } else if (value instanceof Boolean) {
            cell.setCellValue((Boolean) value);
        } else if (value instanceof Date) {
            cell.setCellValue((Date) value);
        } else {
            cell.setCellValue(value.toString());
        }
    }
}
