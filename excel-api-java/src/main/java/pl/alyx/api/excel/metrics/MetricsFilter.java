package pl.alyx.api.excel.metrics;

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
        }
    }
}
