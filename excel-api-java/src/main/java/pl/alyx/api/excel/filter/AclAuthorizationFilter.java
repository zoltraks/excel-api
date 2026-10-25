package pl.alyx.api.excel.filter;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import pl.alyx.api.excel.configuration.AppConfiguration;
import pl.alyx.api.excel.configuration.JacksonConfiguration;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.MediaType;
import org.springframework.lang.NonNull;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import pl.alyx.api.excel.configuration.AccessConfiguration;

import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Filter that enforces scope and ACL rules from access.yaml on authenticated requests.
 */
@Component
public class AclAuthorizationFilter extends OncePerRequestFilter {

    private static final Set<String> PUBLIC_PATHS = Set.of(
            "/auth/token",
            "/health",
            "/metrics",
            "/openapi.yaml",
            "/openapi.json"
    );
    private static final String ADMIN_ENDPOINT_SUFFIX = "/lock-status";
    private static final int STATUS_FORBIDDEN = 403;

    private final AccessConfiguration accessConfiguration;
    private final ObjectMapper objectMapper = new ObjectMapper();

    /**
     * Creates a new AclAuthorizationFilter.
     * @param accessConfiguration the access configuration containing ACL rules
     */
    public AclAuthorizationFilter(final AccessConfiguration accessConfiguration, final AppConfiguration configuration) {
        this.accessConfiguration = accessConfiguration;
        if (JacksonConfiguration.isPretty(configuration)) {
            objectMapper.enable(SerializationFeature.INDENT_OUTPUT);
        }
    }

    /**
     * Filters requests to enforce scope and ACL rules.
     * @param request the HTTP request
     * @param response the HTTP response
     * @param filterChain the filter chain
     * @throws ServletException if a servlet error occurs
     * @throws IOException if an I/O error occurs
     */
    @Override
    protected void doFilterInternal(
            @NonNull final HttpServletRequest request,
            @NonNull final HttpServletResponse response,
            @NonNull final FilterChain filterChain
    ) throws ServletException, IOException {

        final String path = request.getServletPath();

        if (PUBLIC_PATHS.contains(path)) {
            filterChain.doFilter(request, response);
            return;
        }

        final Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        if (authentication == null || !authentication.isAuthenticated()) {
            filterChain.doFilter(request, response);
            return;
        }

        final boolean isAdminEndpoint = path.endsWith(ADMIN_ENDPOINT_SUFFIX);
        final String requiredScope = isAdminEndpoint
                ? "admin"
                : "GET".equals(request.getMethod()) ? "read" : "write";

        final List<String> tokenScopes = authentication.getAuthorities().stream()
                .map(a -> a.getAuthority())
                .toList();

        if (!checkPermission(tokenScopes, requiredScope, request.getMethod(), isAdminEndpoint)) {
            response.setStatus(STATUS_FORBIDDEN);
            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
            objectMapper.writeValue(response.getWriter(), Map.of(
                    "error", "FORBIDDEN",
                    "message", "Insufficient permissions"
            ));
            return;
        }

        filterChain.doFilter(request, response);
    }

    private boolean checkPermission(
            final List<String> tokenScopes,
            final String requiredScope,
            final String method,
            final boolean isAdminEndpoint) {

        if (!tokenScopes.contains(requiredScope)) {
            return false;
        }

        if (accessConfiguration.getAcl() == null || accessConfiguration.getAcl().getRules() == null) {
            return true;
        }

        final AccessConfiguration.AclConfiguration.Rule rule = accessConfiguration.getAcl().getRules().stream()
                .filter(r -> requiredScope.equals(r.getScope()))
                .findFirst()
                .orElse(null);

        if (rule == null) {
            return true;
        }

        if (rule.getAllow() != null
                && rule.getAllow().stream().noneMatch(m -> m.equalsIgnoreCase(method))) {
            return false;
        }

        return !isAdminEndpoint || Boolean.TRUE.equals(rule.getAdminEndpoints());
    }
}
