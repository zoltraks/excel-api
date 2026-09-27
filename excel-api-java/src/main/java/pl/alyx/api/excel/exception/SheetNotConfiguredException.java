package pl.alyx.api.excel.exception;

import org.springframework.http.HttpStatus;

public class SheetNotConfiguredException extends ApiException {

    public SheetNotConfiguredException(String sheetName) {
        super("SHEET_NOT_CONFIGURED",
                "Sheet '" + sheetName + "' is not configured for tabular access",
                HttpStatus.BAD_REQUEST.value());
    }

    public SheetNotConfiguredException(String sheetName, String detail) {
        super("SHEET_NOT_CONFIGURED", detail, HttpStatus.BAD_REQUEST.value());
    }
}
