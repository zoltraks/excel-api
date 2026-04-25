package pl.alyx.api.excel.exception;

import org.springframework.http.HttpStatus;

public class WorkbookNotFoundException extends ApiException {

    public WorkbookNotFoundException(String id) {
        super("WORKBOOK_NOT_FOUND", "Workbook with ID '" + id + "' not found",
                HttpStatus.NOT_FOUND.value());
    }
}
