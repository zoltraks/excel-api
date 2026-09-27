package pl.alyx.api.excel.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.MediaType;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Fixed-window per-client rate limiter.
 * POST /auth/token is throttled at rate_limit.token_per_minute; all other
 * requests share rate_limit.requests_per_minute. Configuration comes from the
 * top-level rate_limit section of config.yaml.
 */
@Component
public class RateLimitFilter extends OncePerRequestFilter {

    private static final int STATUS_TOO_MANY_REQUESTS = 429;
    private static final long WINDOW_MS = 60_000L;
    private static final String TOKEN_PATH_SUFFIX = "/auth/token";

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final Map<String, Window> tokenBuckets = new ConcurrentHashMap<>();
    private final Map<String, Window> globalBuckets = new ConcurrentHashMap<>();

    private final boolean enabled;
    private final int tokenPerMinute;
    private final int requestsPerMinute;

    @SuppressWarnings("unchecked")
    public RateLimitFilter(final Map<String, Object> config) {
        final Object section = config.get("rate_limit");
        final Map<String, Object> rateLimit = section instanceof Map
                ? (Map<String, Object>) section
                : Map.of();
        this.enabled = !Boolean.FALSE.equals(rateLimit.get("enabled"));
        this.tokenPerMinute = intValue(rateLimit.get("token_per_minute"), 20);
        this.requestsPerMinute = intValue(rateLimit.get("requests_per_minute"), 600);
    }

    private static int intValue(final Object value, final int fallback) {
        return value instanceof Number ? ((Number) value).intValue() : fallback;
    }

    @Override
    protected void doFilterInternal(
            @NonNull final HttpServletRequest request,
            @NonNull final HttpServletResponse response,
            @NonNull final FilterChain filterChain) throws ServletException, IOException {
        if (!enabled) {
            filterChain.doFilter(request, response);
            return;
        }

        final String key = request.getRemoteAddr();
        final boolean isTokenRequest = "POST".equals(request.getMethod())
                && request.getRequestURI().endsWith(TOKEN_PATH_SUFFIX);

        boolean allowed = hit(globalBuckets, key, requestsPerMinute);
        if (isTokenRequest) {
            allowed = hit(tokenBuckets, key, tokenPerMinute) && allowed;
        }

        if (!allowed) {
            response.setStatus(STATUS_TOO_MANY_REQUESTS);
            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
            objectMapper.writeValue(response.getWriter(), Map.of(
                    "error", "RATE_LIMITED",
                    "message", "Rate limit exceeded"));
            return;
        }
        filterChain.doFilter(request, response);
    }

    private boolean hit(final Map<String, Window> buckets, final String key, final int limit) {
        final long now = System.currentTimeMillis();
        final Window window = buckets.compute(key, (k, w) ->
                w == null || now - w.start >= WINDOW_MS ? new Window(now) : w);
        return window.incrementAndGet() <= limit;
    }

    private static final class Window {
        private final long start;
        private int count;

        Window(final long start) {
            this.start = start;
        }

        synchronized int incrementAndGet() {
            return ++count;
        }
    }
}
