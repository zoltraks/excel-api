package pl.alyx.api.excel.exception;

import org.springframework.http.HttpStatus;

public class SheetNotFoundException extends ApiException {

    public SheetNotFoundException(String sheetName) {
        super("SHEET_NOT_FOUND", "Sheet '" + sheetName + "' not found in workbook",
                HttpStatus.NOT_FOUND.value());
    }
}
