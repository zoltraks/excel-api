package pl.alyx.api.excel.security;

import io.jsonwebtoken.JwtException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

import java.util.List;

public class JwtUtilTest {
    private JwtUtil jwtUtil;
    private static final String SECRET = "test-secret-key-for-testing-purposes-only";

    @BeforeEach
    public void setUp() {
        jwtUtil = new JwtUtil(SECRET);
    }

    @Test
    public void testGenerateToken() {
        String token = jwtUtil.generateToken("test-user", List.of("read", "write"), 60);
        assertNotNull(token);
        assertFalse(token.isEmpty());
    }

    @Test
    public void testExtractSubject() {
        String token = jwtUtil.generateToken("test-user", List.of("read"), 60);
        String subject = jwtUtil.extractSubject(token);
        assertEquals("test-user", subject);
    }

    @Test
    public void testExtractScopes() {
        List<String> scopes = List.of("read", "write", "admin");
        String token = jwtUtil.generateToken("test-user", scopes, 60);
        List<String> extractedScopes = jwtUtil.extractScopes(token);
        assertEquals(scopes, extractedScopes);
    }

    @Test
    public void testValidateToken() {
        String token = jwtUtil.generateToken("test-user", List.of("read"), 60);
        assertTrue(jwtUtil.validateToken(token));
    }

    @Test
    public void testValidateInvalidToken() {
        assertFalse(jwtUtil.validateToken("invalid-token"));
    }

    @Test
    public void testValidateExpiredToken() {
        String token = jwtUtil.generateToken("test-user", List.of("read"), -1);
        assertFalse(jwtUtil.validateToken(token));
    }

    @Test
    public void testExtractClaims() {
        String token = jwtUtil.generateToken("test-user", List.of("read", "write"), 60);
        assertNotNull(jwtUtil.extractClaims(token));
    }

    @Test
    public void testGenerateTokenWithSingleScope() {
        String token = jwtUtil.generateToken("test-user", List.of("read"), 60);
        List<String> scopes = jwtUtil.extractScopes(token);
        assertEquals(1, scopes.size());
        assertEquals("read", scopes.get(0));
    }

    @Test
    public void testGenerateTokenWithNoScopes() {
        String token = jwtUtil.generateToken("test-user", List.of(), 60);
        List<String> scopes = jwtUtil.extractScopes(token);
        assertTrue(scopes.isEmpty());
    }

    @Test
    public void testExtractClaimsFromInvalidToken() {
        assertThrows(JwtException.class, () -> {
            jwtUtil.extractClaims("invalid-token");
        });
    }
}
