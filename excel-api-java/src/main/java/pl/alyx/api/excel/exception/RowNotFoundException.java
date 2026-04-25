package pl.alyx.api.excel.exception;

import org.springframework.http.HttpStatus;

public class RowNotFoundException extends ApiException {

    public RowNotFoundException(int recordIndex) {
        super("ROW_NOT_FOUND", "Record index " + recordIndex + " out of range",
                HttpStatus.NOT_FOUND.value());
    }
}
