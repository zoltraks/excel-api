package pl.alyx.api.excel.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import pl.alyx.api.excel.config.AccessConfig;
import pl.alyx.api.excel.security.JwtUtil;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/auth")
public class AuthController {

    private static final int DEFAULT_EXPIRATION_MINUTES = 60;
    private static final int DEFAULT_EXPIRATION_SECONDS = 3600;
    private static final int STATUS_UNAUTHORIZED = 401;
    private static final int STATUS_BAD_REQUEST = 400;
    private final JwtUtil jwtUtil;
    private final AccessConfig accessConfig;

    public AuthController(JwtUtil jwtUtil, AccessConfig accessConfig) {
        this.jwtUtil = jwtUtil;
        this.accessConfig = accessConfig;
    }

    @PostMapping("/token")
    public ResponseEntity<?> getToken(@RequestBody(required = false) Map<String, String> jsonRequest) {
        String grantType = jsonRequest != null ? jsonRequest.get("grant_type") : null;

        if ("client_credentials".equals(grantType)) {
            String clientId = jsonRequest.get("client_id");
            String clientSecret = jsonRequest.get("client_secret");

            if (!validateOAuth2Client(clientId, clientSecret)) {
                return ResponseEntity.status(STATUS_UNAUTHORIZED).body(Map.of(
                        "error", "invalid_client",
                        "error_description", "Invalid client credentials"
                ));
            }

            List<String> scopes = getScopesForClient(clientId);
            String token = jwtUtil.generateToken(clientId, scopes, DEFAULT_EXPIRATION_MINUTES);

            return ResponseEntity.ok(Map.of(
                    "access_token", token,
                    "token_type", "Bearer",
                    "expires_in", DEFAULT_EXPIRATION_SECONDS,
                    "scope", String.join(" ", scopes)
            ));
        } else if ("password".equals(grantType)) {
            String username = jsonRequest.get("username");
            String password = jsonRequest.get("password");

            if (!validateUser(username, password)) {
                return ResponseEntity.status(STATUS_UNAUTHORIZED).body(Map.of(
                        "error", "invalid_grant",
                        "error_description", "Invalid username or password"
                ));
            }

            List<String> scopes = getScopesForUser(username);
            String token = jwtUtil.generateToken(username, scopes, DEFAULT_EXPIRATION_MINUTES);

            return ResponseEntity.ok(Map.of(
                    "access_token", token,
                    "token_type", "Bearer",
                    "expires_in", DEFAULT_EXPIRATION_SECONDS,
                    "scope", String.join(" ", scopes)
            ));
        } else {
            return ResponseEntity.status(STATUS_BAD_REQUEST).body(Map.of(
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
                return ResponseEntity.status(STATUS_UNAUTHORIZED).body(Map.of(
                        "error", "invalid_client",
                        "error_description", "Invalid client credentials"
                ));
            }

            List<String> scopes = getScopesForClient(clientId);
            String token = jwtUtil.generateToken(clientId, scopes, DEFAULT_EXPIRATION_MINUTES);

            return ResponseEntity.ok(Map.of(
                    "access_token", token,
                    "token_type", "Bearer",
                    "expires_in", DEFAULT_EXPIRATION_SECONDS,
                    "scope", String.join(" ", scopes)
            ));
        } else if ("password".equals(grantType)) {
            String username = formRequest.get("username");
            String password = formRequest.get("password");

            if (!validateUser(username, password)) {
                return ResponseEntity.status(STATUS_UNAUTHORIZED).body(Map.of(
                        "error", "invalid_grant",
                        "error_description", "Invalid username or password"
                ));
            }

            List<String> scopes = getScopesForUser(username);
            String token = jwtUtil.generateToken(username, scopes, DEFAULT_EXPIRATION_MINUTES);

            return ResponseEntity.ok(Map.of(
                    "access_token", token,
                    "token_type", "Bearer",
                    "expires_in", DEFAULT_EXPIRATION_SECONDS,
                    "scope", String.join(" ", scopes)
            ));
        } else {
            return ResponseEntity.status(STATUS_BAD_REQUEST).body(Map.of(
                    "error", "unsupported_grant_type",
                    "error_description", "Grant type not supported"
            ));
        }
    }

    private boolean validateOAuth2Client(String clientId, String clientSecret) {
        if (accessConfig.getOauth2() == null || accessConfig.getOauth2().getClients() == null) {
            return false;
        }
        return accessConfig.getOauth2().getClients().stream()
                .anyMatch(c -> c.getClientId().equals(clientId) && c.getClientSecret().equals(clientSecret));
    }

    private List<String> getScopesForClient(String clientId) {
        if (accessConfig.getOauth2() == null || accessConfig.getOauth2().getClients() == null) {
            return List.of();
        }
        return accessConfig.getOauth2().getClients().stream()
                .filter(c -> c.getClientId().equals(clientId))
                .findFirst()
                .map(c -> c.getScopes())
                .orElse(List.of());
    }

    private boolean validateUser(String username, String password) {
        if (accessConfig.getOauth2() == null || accessConfig.getOauth2().getUsers() == null) {
            return false;
        }
        return accessConfig.getOauth2().getUsers().stream()
                .anyMatch(u -> u.getUsername().equals(username) && u.getPasswordHash().equals(password));
    }

    private List<String> getScopesForUser(String username) {
        if (accessConfig.getOauth2() == null || accessConfig.getOauth2().getUsers() == null) {
            return List.of();
        }
        return accessConfig.getOauth2().getUsers().stream()
                .filter(u -> u.getUsername().equals(username))
                .findFirst()
                .map(u -> u.getScopes())
                .orElse(List.of());
    }
}
