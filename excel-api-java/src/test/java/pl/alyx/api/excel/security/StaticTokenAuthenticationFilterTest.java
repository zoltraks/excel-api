package pl.alyx.api.excel.security;

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
import pl.alyx.api.excel.config.AccessConfig;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@DisplayName("StaticTokenAuthenticationFilter")
class StaticTokenAuthenticationFilterTest {

    private AccessConfig accessConfig;
    private StaticTokenAuthenticationFilter filter;
    private HttpServletRequest request;
    private HttpServletResponse response;
    private FilterChain filterChain;

    @BeforeEach
    void setUp() {
        accessConfig = new AccessConfig();
        filter = new StaticTokenAuthenticationFilter(accessConfig);
        request = mock(HttpServletRequest.class);
        response = mock(HttpServletResponse.class);
        filterChain = mock(FilterChain.class);
        SecurityContextHolder.clearContext();
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    private AccessConfig.TokensConfig buildTokensConfig(String token, String name, List<String> scopes) {
        AccessConfig.TokensConfig.StaticToken staticToken = new AccessConfig.TokensConfig.StaticToken();
        staticToken.setToken(token);
        staticToken.setName(name);
        staticToken.setScopes(scopes);
        AccessConfig.TokensConfig tokensConfig = new AccessConfig.TokensConfig();
        tokensConfig.setStaticTokens(List.of(staticToken));
        return tokensConfig;
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
            accessConfig.setTokens(buildTokensConfig("my-secret-token", "test-user", List.of("read", "write")));
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
            accessConfig.setTokens(buildTokensConfig("real-token", "user", List.of("read")));
            when(request.getHeader("Authorization")).thenReturn("Token wrong-token");

            filter.doFilterInternal(request, response, filterChain);

            verify(filterChain).doFilter(request, response);
            assertNull(SecurityContextHolder.getContext().getAuthentication());
        }

        @Test
        @DisplayName("does not authenticate when tokens config is null")
        void nullTokensConfig() throws Exception {
            when(request.getHeader("Authorization")).thenReturn("Token some-token");

            filter.doFilterInternal(request, response, filterChain);

            verify(filterChain).doFilter(request, response);
            assertNull(SecurityContextHolder.getContext().getAuthentication());
        }

        @Test
        @DisplayName("authenticates token with empty scopes")
        void tokenWithNoScopes() throws Exception {
            accessConfig.setTokens(buildTokensConfig("no-scope-token", "limited-user", null));
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
            AccessConfig.TokensConfig.StaticToken t1 = new AccessConfig.TokensConfig.StaticToken();
            t1.setToken("token-a");
            t1.setName("user-a");
            t1.setScopes(List.of("read"));
            AccessConfig.TokensConfig.StaticToken t2 = new AccessConfig.TokensConfig.StaticToken();
            t2.setToken("token-b");
            t2.setName("user-b");
            t2.setScopes(List.of("write"));
            AccessConfig.TokensConfig tokensConfig = new AccessConfig.TokensConfig();
            tokensConfig.setStaticTokens(List.of(t1, t2));
            accessConfig.setTokens(tokensConfig);
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
            AccessConfig.TokensConfig tokensConfig = new AccessConfig.TokensConfig();
            tokensConfig.setStaticTokens(List.of());
            accessConfig.setTokens(tokensConfig);
            when(request.getHeader("Authorization")).thenReturn("Token any-token");

            filter.doFilterInternal(request, response, filterChain);

            verify(filterChain).doFilter(request, response);
            assertNull(SecurityContextHolder.getContext().getAuthentication());
        }
    }
}
