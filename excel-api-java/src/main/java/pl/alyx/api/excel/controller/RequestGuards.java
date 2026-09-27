package pl.alyx.api.excel.controller;

import pl.alyx.api.excel.exception.ValidationException;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * Request body guards enforcing contract schemas at the controller boundary.
 * Violations raise {@link ValidationException} which maps to
 * 400 {@code INVALID_REQUEST}.
 */
public final class RequestGuards {

    private RequestGuards() {
    }

    /** Extracts a required {@code data} object from a request body. */
    @SuppressWarnings("unchecked")
    public static Map<String, Object> requireData(final Map<String, Object> request) {
        final Object data = request.get("data");
        if (!(data instanceof Map)) {
            throw new ValidationException("'data' is required and must be an object");
        }
        return (Map<String, Object>) data;
    }

    /** Extracts a required non-empty {@code operations} array of objects. */
    public static List<Map<String, Object>> requireOperations(final Map<String, Object> request) {
        final Object raw = request.get("operations");
        if (!(raw instanceof List) || ((List<?>) raw).isEmpty()) {
            throw new ValidationException(
                    "Request body must contain a non-empty operations array");
        }
        final List<Map<String, Object>> operations = new ArrayList<>();
        for (final Object item : (List<?>) raw) {
            if (!(item instanceof Map)) {
                throw new ValidationException("Each operation must be an object");
            }
            @SuppressWarnings("unchecked")
            final Map<String, Object> operation = (Map<String, Object>) item;
            operations.add(operation);
        }
        return operations;
    }

    /** Casts an optional numeric field to {@link Integer}; rejects other types. */
    public static Integer asInteger(final Object value) {
        if (value == null) {
            return null;
        }
        if (value instanceof Number) {
            return ((Number) value).intValue();
        }
        throw new ValidationException("Expected an integer value");
    }
}
