// Authentication and authorization: JWT, static tokens, OAuth2, ACL.

mod jwt;
mod oauth;
mod static_token;

pub use jwt::*;
pub use oauth::*;
pub use static_token::*;

use axum::http::StatusCode;
use axum::response::Response;
use sha2::{Digest, Sha256};
use subtle::ConstantTimeEq;

use crate::config::AccessConfig;
use crate::error::err_body;

#[derive(Debug, Clone)]
pub struct AuthContext {
    pub sub: String,
    pub scopes: Vec<String>,
}

/// Constant-time comparison: both sides SHA-256 hashed first, matching the
/// reference implementation's comparison protocol.
pub fn secrets_equal(a: &str, b: &str) -> bool {
    let ha = Sha256::digest(a.as_bytes());
    let hb = Sha256::digest(b.as_bytes());
    ha.ct_eq(&hb).into()
}

pub struct AclChecker {
    rules: Vec<crate::config::AclRule>,
}

impl AclChecker {
    pub fn new(access: &AccessConfig) -> Self {
        Self {
            rules: access.acl.rules.clone(),
        }
    }

    pub fn check(&self, scope: &str, method: &str, admin_endpoint: bool) -> bool {
        let Some(rule) = self.rules.iter().find(|r| r.scope == scope) else {
            return false;
        };
        if admin_endpoint && !rule.admin_endpoints {
            return false;
        }
        rule.allow.iter().any(|m| m.eq_ignore_ascii_case(method))
    }
}

/// Authentication middleware: `Authorization: Bearer` (JWT) and
/// `Authorization: Token` (static). Inserts `AuthContext` into extensions.
pub async fn auth_middleware(
    state: axum::extract::State<std::sync::Arc<crate::state::AppState>>,
    mut request: axum::extract::Request,
    next: axum::middleware::Next,
) -> Response {
    if state.config.auth.mode == "none" {
        request.extensions_mut().insert(AuthContext {
            sub: "anonymous".to_string(),
            scopes: vec!["read".to_string(), "write".to_string(), "admin".to_string()],
        });
        return next.run(request).await;
    }
    let header = request
        .headers()
        .get(axum::http::header::AUTHORIZATION)
        .and_then(|v| v.to_str().ok())
        .unwrap_or("");
    let mode = state.config.auth.mode.as_str();
    let allow_jwt = matches!(mode, "jwt" | "both");
    let allow_static = matches!(mode, "static" | "both");

    if let Some(token) = header.strip_prefix("Bearer ")
        && allow_jwt
    {
        match state.jwt.verify(token) {
            Ok(ctx) => {
                state
                    .logger
                    .debug("Authenticated", Some(serde_json::json!({ "sub": ctx.sub })));
                request.extensions_mut().insert(ctx);
                return next.run(request).await;
            }
            Err(_e) => {
                state.metrics.increment(
                    "excel_api_errors_total",
                    1.0,
                    &[("error", "TOKEN_EXPIRED")],
                );
                return err_body(
                    state.pretty,
                    StatusCode::UNAUTHORIZED,
                    "TOKEN_EXPIRED",
                    "Invalid or expired token",
                );
            }
        }
    }
    if let Some(token) = header.strip_prefix("Token ")
        && allow_static
        && let Some(found) = lookup_static_token(&state.access, token)
    {
        state.logger.debug(
            "Authenticated",
            Some(serde_json::json!({ "sub": found.name })),
        );
        request.extensions_mut().insert(AuthContext {
            sub: found.name.clone(),
            scopes: found.scopes.clone(),
        });
        return next.run(request).await;
    }
    state
        .metrics
        .increment("excel_api_errors_total", 1.0, &[("error", "UNAUTHORIZED")]);
    err_body(
        state.pretty,
        StatusCode::UNAUTHORIZED,
        "UNAUTHORIZED",
        "Authentication required",
    )
}

/// Scope guard: token scope first, then ACL rule (method + admin gate).
#[allow(clippy::result_large_err)]
// REASON: axum handlers return full Responses on the error path; boxing would
// obscure the idiomatic middleware shape for a cold path.
pub fn scope_check(
    state: &crate::state::AppState,
    request: &axum::extract::Request,
    required: &str,
    admin_endpoint: bool,
) -> Result<(), Response> {
    let Some(ctx) = request.extensions().get::<AuthContext>() else {
        return Err(err_body(
            state.pretty,
            StatusCode::UNAUTHORIZED,
            "UNAUTHORIZED",
            "Missing authentication context",
        ));
    };
    if !ctx.scopes.iter().any(|s| s == required) {
        state
            .metrics
            .increment("excel_api_errors_total", 1.0, &[("error", "FORBIDDEN")]);
        return Err(err_body(
            state.pretty,
            StatusCode::FORBIDDEN,
            "FORBIDDEN",
            &format!("Insufficient scope: '{required}' required"),
        ));
    }
    let method = request.method().as_str();
    if !state.acl.check(required, method, admin_endpoint) {
        state
            .metrics
            .increment("excel_api_errors_total", 1.0, &[("error", "FORBIDDEN")]);
        return Err(err_body(
            state.pretty,
            StatusCode::FORBIDDEN,
            "FORBIDDEN",
            &format!("Method '{method}' not allowed for scope '{required}'"),
        ));
    }
    Ok(())
}

/// Scope-check middleware invoked by route-layer closures.
pub async fn require_fn(
    axum::extract::State(state): axum::extract::State<std::sync::Arc<crate::state::AppState>>,
    request: axum::extract::Request,
    next: axum::middleware::Next,
    required: &str,
    admin_endpoint: bool,
) -> Response {
    match scope_check(&state, &request, required, admin_endpoint) {
        Ok(()) => next.run(request).await,
        Err(resp) => resp,
    }
}

#[cfg(test)]
mod tests {
    #![allow(clippy::unwrap_used, clippy::expect_used, clippy::panic)]
    use super::*;
    use crate::config::*;

    fn test_access() -> AccessConfig {
        AccessConfig {
            jwt: AccessJwt {
                secret: "0123456789abcdef0123456789abcdef".to_string(),
            },
            oauth2: AccessOAuth2 {
                clients: vec![OAuth2Client {
                    client_id: "c".to_string(),
                    client_secret: "s".to_string(),
                    grant_types: vec!["client_credentials".to_string()],
                    scopes: vec!["read".to_string()],
                }],
                users: vec![],
            },
            tokens: AccessTokens {
                r#static: vec![StaticToken {
                    token: "tok".to_string(),
                    name: "n".to_string(),
                    scopes: vec!["read".to_string()],
                }],
            },
            acl: AccessAcl {
                rules: vec![AclRule {
                    scope: "read".to_string(),
                    allow: vec!["GET".to_string()],
                    admin_endpoints: false,
                }],
            },
        }
    }

    fn test_config() -> Config {
        serde_yaml_ng::from_str(
            r"
server: {port: 1, host: h}
openapi: {title: t, description: d}
registry: {directory: d, workbooks: []}
queue: {batch_max_size: 1, batch_debounce_ms: 1, lock_timeout_ms: 1, lock_dir: d}
cache: {enabled: false}
auth: {mode: both, jwt: {issuer: i, expiration_minutes: 5}}
logging: {level: info}
",
        )
        .unwrap()
    }

    #[test]
    fn jwt_round_trip() {
        let jwt = JwtAuth::new(&test_config(), &test_access());
        let (token, expires) = jwt.sign("alice", &["read".to_string()]).unwrap();
        assert_eq!(expires, 300);
        let ctx = jwt.verify(&token).unwrap();
        assert_eq!(ctx.sub, "alice");
        assert_eq!(ctx.scopes, vec!["read"]);
        assert!(jwt.verify("bad.token.here").is_err());
    }

    #[test]
    fn static_token_and_client_lookup() {
        let access = test_access();
        assert!(lookup_static_token(&access, "tok").is_some());
        assert!(lookup_static_token(&access, "nope").is_none());
        assert!(client_credentials_grant(&access, "c", "s").is_ok());
        assert!(client_credentials_grant(&access, "c", "wrong").is_err());
    }

    #[test]
    fn acl_method_and_admin_gate() {
        let acl = AclChecker::new(&test_access());
        assert!(acl.check("read", "GET", false));
        assert!(!acl.check("read", "POST", false));
        assert!(!acl.check("read", "GET", true));
        assert!(!acl.check("admin", "GET", false));
    }
}
