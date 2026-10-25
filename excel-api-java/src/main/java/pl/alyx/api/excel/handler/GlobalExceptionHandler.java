package pl.alyx.api.excel.handler;

import org.springframework.http.HttpStatus;
import pl.alyx.api.excel.utility.OrderedJson;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.servlet.resource.NoResourceFoundException;
import pl.alyx.api.excel.exception.ApiException;

import java.util.LinkedHashMap;
import java.util.Map;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(ApiException.class)
    public ResponseEntity<Map<String, Object>> handleApiException(ApiException ex) {
        return ResponseEntity.status(ex.getHttpStatus()).body(OrderedJson.body(
                "error", ex.getErrorCode(),
                "message", ex.getMessage()
            ));
    }

    @ExceptionHandler(NoResourceFoundException.class)
    public ResponseEntity<Map<String, Object>> handleNoResource(NoResourceFoundException ex) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(OrderedJson.body(
                "error", "NOT_FOUND",
                "message", "Resource not found"
            ));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, Object>> handleUnexpected(Exception ex) {
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(OrderedJson.body(
                        "error", "INTERNAL_ERROR",
                        "message", ex.getClass().getSimpleName() + ": " + ex.getMessage()
                    ));
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, Object>> handleIllegalArgument(IllegalArgumentException ex) {
        String message = ex.getMessage() != null ? ex.getMessage() : "Invalid request";
        String code = "INVALID_REQUEST";
        HttpStatus httpStatus = HttpStatus.BAD_REQUEST;

        if (message.contains("not found") || message.contains("out of range")) {
            code = "NOT_FOUND";
            httpStatus = HttpStatus.NOT_FOUND;
        }

        final String finalCode = code;
        final String finalMessage = message;
        return ResponseEntity.status(httpStatus).body(OrderedJson.body("error", finalCode, "message", finalMessage));
    }
}
