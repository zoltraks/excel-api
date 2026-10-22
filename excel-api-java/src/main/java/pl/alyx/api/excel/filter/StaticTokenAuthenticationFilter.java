package pl.alyx.api.excel.filter;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;
import pl.alyx.api.excel.configuration.AccessConfiguration;
import pl.alyx.api.excel.configuration.AccessConfiguration.TokensConfiguration.StaticToken;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.List;

/**
 * Servlet filter that authenticates requests using static tokens from access.yaml.
 */
public class StaticTokenAuthenticationFilter extends OncePerRequestFilter {

    private static final String TOKEN_PREFIX = "Token ";

    private final AccessConfiguration accessConfiguration;

    /**
     * Creates a new StaticTokenAuthenticationFilter.
     * @param accessConfiguration the access configuration containing static tokens
     */
    public StaticTokenAuthenticationFilter(final AccessConfiguration accessConfiguration) {
        this.accessConfiguration = accessConfiguration;
    }

    /**
     * Filters requests to authenticate via static tokens.
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

        final String authHeader = request.getHeader("Authorization");

        if (authHeader == null || !authHeader.startsWith(TOKEN_PREFIX)) {
            filterChain.doFilter(request, response);
            return;
        }

        final String token = authHeader.substring(TOKEN_PREFIX.length());

        if (accessConfiguration.getTokens() != null && accessConfiguration.getTokens().getStaticTokens() != null) {
            for (StaticToken staticToken : accessConfiguration.getTokens().getStaticTokens()) {
                if (staticToken.getToken() != null
                        && MessageDigest.isEqual(
                                token.getBytes(StandardCharsets.UTF_8),
                                staticToken.getToken().getBytes(StandardCharsets.UTF_8))) {
                    final List<SimpleGrantedAuthority> authorities = staticToken.getScopes() == null
                            ? List.of()
                            : staticToken.getScopes().stream()
                                    .map(SimpleGrantedAuthority::new)
                                    .toList();

                    final UsernamePasswordAuthenticationToken authentication =
                            new UsernamePasswordAuthenticationToken(
                                    staticToken.getName(),
                                    null,
                                    authorities);

                    SecurityContextHolder.getContext().setAuthentication(authentication);
                    break;
                }
            }
        }

        filterChain.doFilter(request, response);
    }
}
