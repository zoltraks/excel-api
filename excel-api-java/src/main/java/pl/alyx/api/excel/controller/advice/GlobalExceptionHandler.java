package pl.alyx.api.excel.controller.advice;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import pl.alyx.api.excel.exception.ApiException;

import java.util.Map;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(ApiException.class)
    public ResponseEntity<Map<String, Object>> handleApiException(ApiException ex) {
        return ResponseEntity.status(ex.getHttpStatus()).body(Map.of(
                "error", ex.getErrorCode(),
                "message", ex.getMessage()
        ));
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, Object>> handleIllegalArgument(IllegalArgumentException ex) {
        String message = ex.getMessage() != null ? ex.getMessage() : "Invalid request";
        String code = "INVALID_REQUEST";
        HttpStatus httpStatus = HttpStatus.BAD_REQUEST;

        if (message.contains("not found")) {
            code = "NOT_FOUND";
            httpStatus = HttpStatus.NOT_FOUND;
        }

        return ResponseEntity.status(httpStatus).body(Map.of(
                "error", code,
                "message", message
        ));
    }
}
