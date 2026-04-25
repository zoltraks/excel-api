package pl.alyx.api.excel.exception;

import org.springframework.http.HttpStatus;

public class ReadonlyWorkbookException extends ApiException {

    public ReadonlyWorkbookException() {
        super("READONLY_WORKBOOK", "Workbook is readonly", HttpStatus.UNPROCESSABLE_ENTITY.value());
    }
}
