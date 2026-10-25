package pl.alyx.api.excel.controller;

import org.springframework.http.ResponseEntity;
import pl.alyx.api.excel.utility.OrderedJson;
import org.springframework.security.crypto.bcrypt.BCrypt;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import pl.alyx.api.excel.configuration.AccessConfiguration;
import pl.alyx.api.excel.utility.JwtUtil;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.List;
import java.util.LinkedHashMap;
import java.util.Map;

@RestController
@RequestMapping("/auth")
public class AuthController {

    private static final int DEFAULT_EXPIRATION_MINUTES = 60;
    private static final int DEFAULT_EXPIRATION_SECONDS = 3600;
    private static final int STATUS_UNAUTHORIZED = 401;
    private static final int STATUS_BAD_REQUEST = 400;
    private final JwtUtil jwtUtil;
    private final AccessConfiguration accessConfiguration;

    public AuthController(JwtUtil jwtUtil, AccessConfiguration accessConfiguration) {
        this.jwtUtil = jwtUtil;
        this.accessConfiguration = accessConfiguration;
    }

    @PostMapping("/token")
    public ResponseEntity<?> getToken(@RequestBody(required = false) Map<String, String> jsonRequest) {
        if (jsonRequest == null) {
            return ResponseEntity.status(STATUS_BAD_REQUEST).body(OrderedJson.body(
                    "error", "invalid_request",
                    "error_description", "Request body is required"
                ));
        }
        String grantType = jsonRequest.get("grant_type");

        if ("client_credentials".equals(grantType)) {
            String clientId = jsonRequest.get("client_id");
            String clientSecret = jsonRequest.get("client_secret");

            if (!validateOAuth2Client(clientId, clientSecret)) {
                return ResponseEntity.status(STATUS_UNAUTHORIZED).body(OrderedJson.body(
                        "error", "invalid_client",
                        "error_description", "Invalid client credentials"
                    ));
            }

            List<String> scopes = getScopesForClient(clientId);
            String token = jwtUtil.generateToken(clientId, scopes, DEFAULT_EXPIRATION_MINUTES);

            return ResponseEntity.ok(OrderedJson.body(
                    "access_token", token,
                    "token_type", "Bearer",
                    "expires_in", DEFAULT_EXPIRATION_SECONDS
                ));
        } else if ("password".equals(grantType)) {
            String username = jsonRequest.get("username");
            String password = jsonRequest.get("password");

            if (!validateUser(username, password)) {
                return ResponseEntity.status(STATUS_UNAUTHORIZED).body(OrderedJson.body(
                        "error", "invalid_grant",
                        "error_description", "Invalid username or password"
                    ));
            }

            List<String> scopes = getScopesForUser(username);
            String token = jwtUtil.generateToken(username, scopes, DEFAULT_EXPIRATION_MINUTES);

            return ResponseEntity.ok(OrderedJson.body(
                    "access_token", token,
                    "token_type", "Bearer",
                    "expires_in", DEFAULT_EXPIRATION_SECONDS
                ));
        } else {
            return ResponseEntity.status(STATUS_BAD_REQUEST).body(OrderedJson.body(
                    "error", "unsupported_grant_type",
                    "error_description", "Grant type not supported"
                ));
        }
    }

    @PostMapping(value = "/token", consumes = "application/x-www-form-urlencoded")
    public ResponseEntity<?> getTokenForm(@RequestParam Map<String, String> formRequest) {
        String grantType = formRequest.get("grant_type");

        if ("client_credentials".equals(grantType)) {
            String clientId = formRequest.get("client_id");
            String clientSecret = formRequest.get("client_secret");

            if (!validateOAuth2Client(clientId, clientSecret)) {
                return ResponseEntity.status(STATUS_UNAUTHORIZED).body(OrderedJson.body(
                        "error", "invalid_client",
                        "error_description", "Invalid client credentials"
                    ));
            }

            List<String> scopes = getScopesForClient(clientId);
            String token = jwtUtil.generateToken(clientId, scopes, DEFAULT_EXPIRATION_MINUTES);

            return ResponseEntity.ok(OrderedJson.body(
                    "access_token", token,
                    "token_type", "Bearer",
                    "expires_in", DEFAULT_EXPIRATION_SECONDS
                ));
        } else if ("password".equals(grantType)) {
            String username = formRequest.get("username");
            String password = formRequest.get("password");

            if (!validateUser(username, password)) {
                return ResponseEntity.status(STATUS_UNAUTHORIZED).body(OrderedJson.body(
                        "error", "invalid_grant",
                        "error_description", "Invalid username or password"
                    ));
            }

            List<String> scopes = getScopesForUser(username);
            String token = jwtUtil.generateToken(username, scopes, DEFAULT_EXPIRATION_MINUTES);

            return ResponseEntity.ok(OrderedJson.body(
                    "access_token", token,
                    "token_type", "Bearer",
                    "expires_in", DEFAULT_EXPIRATION_SECONDS
                ));
        } else {
            return ResponseEntity.status(STATUS_BAD_REQUEST).body(OrderedJson.body(
                    "error", "unsupported_grant_type",
                    "error_description", "Grant type not supported"
                ));
        }
    }

    private boolean validateOAuth2Client(String clientId, String clientSecret) {
        if (clientId == null || clientSecret == null
                || accessConfiguration.getOauth2() == null || accessConfiguration.getOauth2().getClients() == null) {
            return false;
        }
        return accessConfiguration.getOauth2().getClients().stream()
                .anyMatch(c -> clientId.equals(c.getClientId())
                        && c.getClientSecret() != null
                        && MessageDigest.isEqual(
                                clientSecret.getBytes(StandardCharsets.UTF_8),
                                c.getClientSecret().getBytes(StandardCharsets.UTF_8))
                        && (c.getGrantTypes() == null
                                || c.getGrantTypes().contains("client_credentials")));
    }

    private List<String> getScopesForClient(String clientId) {
        if (accessConfiguration.getOauth2() == null || accessConfiguration.getOauth2().getClients() == null) {
            return List.of();
        }
        return accessConfiguration.getOauth2().getClients().stream()
                .filter(c -> c.getClientId().equals(clientId))
                .findFirst()
                .map(c -> c.getScopes())
                .orElse(List.of());
    }

    private boolean validateUser(String username, String password) {
        if (username == null || password == null
                || accessConfiguration.getOauth2() == null || accessConfiguration.getOauth2().getUsers() == null) {
            return false;
        }
        return accessConfiguration.getOauth2().getUsers().stream()
                .filter(u -> username.equals(u.getUsername()))
                .findFirst()
                .map(u -> {
                    try {
                        return BCrypt.checkpw(password, u.getPasswordHash());
                    } catch (IllegalArgumentException e) {
                        return false;
                    }
                })
                .orElse(false);
    }

    private List<String> getScopesForUser(String username) {
        if (accessConfiguration.getOauth2() == null || accessConfiguration.getOauth2().getUsers() == null) {
            return List.of();
        }
        return accessConfiguration.getOauth2().getUsers().stream()
                .filter(u -> u.getUsername().equals(username))
                .findFirst()
                .map(u -> u.getScopes())
                .orElse(List.of());
    }
}
