package pl.alyx.api.excel.exception;

import org.springframework.http.HttpStatus;

public class FileLockedException extends ApiException {

    public FileLockedException(String message) {
        super("FILE_LOCKED", message, HttpStatus.CONFLICT.value());
    }
}
