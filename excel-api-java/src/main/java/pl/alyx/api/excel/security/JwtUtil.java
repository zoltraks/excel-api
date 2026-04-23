package pl.alyx.api.excel.security;

import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.util.Date;
import java.util.List;

/**
 * JWT utility for token generation and validation.
 */
@Component
public final class JwtUtil {

    private final SecretKey key;

    /**
     * Creates a new JwtUtil with the given secret key.
     * @param secret the secret key for signing tokens
     */
    public JwtUtil(final String secret) {
        this.key = Keys.hmacShaKeyFor(secret.getBytes());
    }

    /**
     * Generates a JWT token for the given subject and scopes.
     * @param subject the subject of the token
     * @param scopes the scopes to include in the token
     * @param expirationMinutes the expiration time in minutes
     * @return the generated JWT token
     */
    public String generateToken(
            final String subject,
            final List<String> scopes,
            final long expirationMinutes) {
        final Date now = new Date();
        final long expirationMs = expirationMinutes * 60 * 1000;
        final Date expiryDate = new Date(now.getTime() + expirationMs);

        return Jwts.builder()
                .subject(subject)
                .claim("scope", scopes)
                .issuedAt(now)
                .expiration(expiryDate)
                .signWith(key)
                .compact();
    }

    /**
     * Extracts claims from a JWT token.
     * @param token the JWT token
     * @return the claims
     */
    public Claims extractClaims(final String token) {
        return Jwts.parser()
                .verifyWith(key)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    /**
     * Extracts the subject from a JWT token.
     * @param token the JWT token
     * @return the subject
     */
    public String extractSubject(final String token) {
        return extractClaims(token).getSubject();
    }

    /**
     * Extracts scopes from a JWT token.
     * @param token the JWT token
     * @return the scopes
     */
    @SuppressWarnings("unchecked")
    public List<String> extractScopes(final String token) {
        return extractClaims(token).get("scope", List.class);
    }

    /**
     * Validates a JWT token.
     * @param token the JWT token
     * @return true if valid, false otherwise
     */
    public boolean validateToken(final String token) {
        try {
            Jwts.parser()
                    .verifyWith(key)
                    .build()
                    .parseSignedClaims(token);
            return true;
        } catch (JwtException | IllegalArgumentException e) {
            return false;
        }
    }
}
