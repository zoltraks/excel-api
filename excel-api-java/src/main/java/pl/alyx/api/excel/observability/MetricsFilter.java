package pl.alyx.api.excel.observability;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * Records request count and duration for the /metrics exposition.
 */
@Component
public class MetricsFilter extends OncePerRequestFilter {

    private final MetricsCollector metricsCollector;

    public MetricsFilter(final MetricsCollector metricsCollector) {
        this.metricsCollector = metricsCollector;
    }

    @Override
    protected void doFilterInternal(
            @NonNull final HttpServletRequest request,
            @NonNull final HttpServletResponse response,
            @NonNull final FilterChain filterChain) throws ServletException, IOException {
        final long start = System.nanoTime();
        try {
            filterChain.doFilter(request, response);
        } finally {
            final double durationMs = (System.nanoTime() - start) / 1_000_000.0;
            metricsCollector.recordRequest(request.getMethod(), response.getStatus(), durationMs);
            final String endpoint = endpointKey(request.getMethod(), request.getRequestURI());
            if (endpoint != null) {
                metricsCollector.recordEndpoint(endpoint, durationMs);
            }
        }
    }

    /**
     * Maps a request path to the shared endpoint metric names used by the
     * other implementations, or null for infra endpoints.
     */
    private static String endpointKey(final String method, final String uri) {
        final String path = uri.endsWith("/") ? uri.substring(0, uri.length() - 1) : uri;
        if ("POST".equals(method) && path.endsWith("/auth/token")) {
            return "auth_token";
        }
        if (path.endsWith("/lock-status")) {
            return "GET".equals(method) ? "lock_status" : null;
        }
        if (path.endsWith("/columns")) {
            return "GET".equals(method) ? "columns_get" : null;
        }
        if (path.endsWith("/records")) {
            return switch (method) {
                case "GET" -> "records_list";
                case "POST" -> "record_add";
                default -> null;
            };
        }
        if (path.endsWith("/operations")) {
            return "POST".equals(method)
                    ? (path.contains("/cells/") ? "batch_cell" : "batch_record") : null;
        }
        if ("/workbooks".equals(path) || path.endsWith("/workbooks")) {
            return "GET".equals(method) ? "workbooks_list" : null;
        }
        final int last = path.lastIndexOf('/');
        final String parentTail = last > 0
                ? path.substring(0, last).substring(Math.max(0, path.substring(0, last).lastIndexOf('/') + 1))
                : "";
        return switch (parentTail) {
            case "records" -> switch (method) {
                case "GET" -> "record_get";
                case "PUT" -> "record_update";
                case "DELETE" -> "record_delete";
                default -> null;
            };
            case "cells" -> switch (method) {
                case "GET" -> "cell_get";
                case "PUT" -> "cell_write";
                default -> null;
            };
            case "ranges" -> "GET".equals(method) ? "range_get" : null;
            case "sheets" -> "GET".equals(method) ? "sheet_get" : null;
            case "workbooks" -> "GET".equals(method) ? "workbook_get" : null;
            default -> null;
        };
    }
}
