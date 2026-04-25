package pl.alyx.api.excel.exception;

import org.springframework.http.HttpStatus;

public class ValidationException extends ApiException {

    public ValidationException(String message) {
        super("INVALID_REQUEST", message, HttpStatus.BAD_REQUEST.value());
    }
}
