package pl.alyx.api.excel.exception;

import org.springframework.http.HttpStatus;

public class ServiceBusyException extends ApiException {

    public ServiceBusyException(String message) {
        super("SERVICE_BUSY", message, HttpStatus.SERVICE_UNAVAILABLE.value());
    }
}
