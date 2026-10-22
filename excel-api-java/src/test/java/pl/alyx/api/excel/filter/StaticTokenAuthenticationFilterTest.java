package pl.alyx.api.excel.filter;

import jakarta.servlet.FilterChain;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import pl.alyx.api.excel.configuration.AccessConfiguration;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@DisplayName("StaticTokenAuthenticationFilter")
class StaticTokenAuthenticationFilterTest {

    private AccessConfiguration accessConfiguration;
    private StaticTokenAuthenticationFilter filter;
    private HttpServletRequest request;
    private HttpServletResponse response;
    private FilterChain filterChain;

    @BeforeEach
    void setUp() {
        accessConfiguration = new AccessConfiguration();
        filter = new StaticTokenAuthenticationFilter(accessConfiguration);
        request = mock(HttpServletRequest.class);
        response = mock(HttpServletResponse.class);
        filterChain = mock(FilterChain.class);
        SecurityContextHolder.clearContext();
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    private AccessConfiguration.TokensConfiguration buildTokensConfiguration(String token, String name, List<String> scopes) {
        AccessConfiguration.TokensConfiguration.StaticToken staticToken = new AccessConfiguration.TokensConfiguration.StaticToken();
        staticToken.setToken(token);
        staticToken.setName(name);
        staticToken.setScopes(scopes);
        AccessConfiguration.TokensConfiguration tokensConfiguration = new AccessConfiguration.TokensConfiguration();
        tokensConfiguration.setStaticTokens(List.of(staticToken));
        return tokensConfiguration;
    }

    @Nested
    @DisplayName("when Authorization header is absent")
    class NoHeader {

        @Test
        @DisplayName("passes request down the chain without authentication")
        void noAuthHeader() throws Exception {
            when(request.getHeader("Authorization")).thenReturn(null);

            filter.doFilterInternal(request, response, filterChain);

            verify(filterChain).doFilter(request, response);
            assertNull(SecurityContextHolder.getContext().getAuthentication());
        }
    }

    @Nested
    @DisplayName("when Authorization header uses Bearer prefix")
    class BearerHeader {

        @Test
        @DisplayName("ignores Bearer tokens and passes chain without authentication")
        void bearerToken() throws Exception {
            when(request.getHeader("Authorization")).thenReturn("Bearer some-jwt-token");

            filter.doFilterInternal(request, response, filterChain);

            verify(filterChain).doFilter(request, response);
            assertNull(SecurityContextHolder.getContext().getAuthentication());
        }
    }

    @Nested
    @DisplayName("when Authorization header uses Token prefix")
    class StaticTokenHeader {

        @Test
        @DisplayName("authenticates valid static token and sets security context")
        void validToken() throws Exception {
            accessConfiguration.setTokens(buildTokensConfiguration("my-secret-token", "test-user", List.of("read", "write")));
            when(request.getHeader("Authorization")).thenReturn("Token my-secret-token");

            filter.doFilterInternal(request, response, filterChain);

            verify(filterChain).doFilter(request, response);
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            assertNotNull(auth);
            assertEquals("test-user", auth.getPrincipal());
            assertEquals(2, auth.getAuthorities().size());
        }

        @Test
        @DisplayName("does not authenticate unknown token")
        void unknownToken() throws Exception {
            accessConfiguration.setTokens(buildTokensConfiguration("real-token", "user", List.of("read")));
            when(request.getHeader("Authorization")).thenReturn("Token wrong-token");

            filter.doFilterInternal(request, response, filterChain);

            verify(filterChain).doFilter(request, response);
            assertNull(SecurityContextHolder.getContext().getAuthentication());
        }

        @Test
        @DisplayName("does not authenticate when tokens configuration is null")
        void nullTokensConfiguration() throws Exception {
            when(request.getHeader("Authorization")).thenReturn("Token some-token");

            filter.doFilterInternal(request, response, filterChain);

            verify(filterChain).doFilter(request, response);
            assertNull(SecurityContextHolder.getContext().getAuthentication());
        }

        @Test
        @DisplayName("authenticates token with empty scopes")
        void tokenWithNoScopes() throws Exception {
            accessConfiguration.setTokens(buildTokensConfiguration("no-scope-token", "limited-user", null));
            when(request.getHeader("Authorization")).thenReturn("Token no-scope-token");

            filter.doFilterInternal(request, response, filterChain);

            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            assertNotNull(auth);
            assertEquals("limited-user", auth.getPrincipal());
            assertEquals(0, auth.getAuthorities().size());
        }

        @Test
        @DisplayName("authenticates first matching token when multiple exist")
        void multipleTokensFirstMatch() throws Exception {
            AccessConfiguration.TokensConfiguration.StaticToken t1 = new AccessConfiguration.TokensConfiguration.StaticToken();
            t1.setToken("token-a");
            t1.setName("user-a");
            t1.setScopes(List.of("read"));
            AccessConfiguration.TokensConfiguration.StaticToken t2 = new AccessConfiguration.TokensConfiguration.StaticToken();
            t2.setToken("token-b");
            t2.setName("user-b");
            t2.setScopes(List.of("write"));
            AccessConfiguration.TokensConfiguration tokensConfiguration = new AccessConfiguration.TokensConfiguration();
            tokensConfiguration.setStaticTokens(List.of(t1, t2));
            accessConfiguration.setTokens(tokensConfiguration);
            when(request.getHeader("Authorization")).thenReturn("Token token-b");

            filter.doFilterInternal(request, response, filterChain);

            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            assertNotNull(auth);
            assertEquals("user-b", auth.getPrincipal());
        }
    }

    @Nested
    @DisplayName("when static token list is empty")
    class EmptyTokenList {

        @Test
        @DisplayName("does not authenticate any token")
        void emptyList() throws Exception {
            AccessConfiguration.TokensConfiguration tokensConfiguration = new AccessConfiguration.TokensConfiguration();
            tokensConfiguration.setStaticTokens(List.of());
            accessConfiguration.setTokens(tokensConfiguration);
            when(request.getHeader("Authorization")).thenReturn("Token any-token");

            filter.doFilterInternal(request, response, filterChain);

            verify(filterChain).doFilter(request, response);
            assertNull(SecurityContextHolder.getContext().getAuthentication());
        }
    }
}
