// Authentication: HS256 JWT, OAuth2 grants, static tokens, ACL.

use axum::http::StatusCode;
use axum::response::Response;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use subtle::ConstantTimeEq;

use crate::config::{AccessConfig, Config};
use crate::error::err_body;

#[derive(Debug, Clone)]
pub struct AuthContext {
    pub sub: String,
    pub scopes: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Claims {
    pub sub: String,
    #[serde(default)]
    pub scope: Vec<String>,
    pub iss: String,
    pub iat: u64,
    pub exp: u64,
}

pub struct JwtAuth {
    secret: String,
    issuer: String,
    pub expiration_minutes: u64,
}

impl JwtAuth {
    pub fn new(config: &Config, access: &AccessConfig) -> Self {
        Self {
            secret: access.jwt.secret.clone(),
            issuer: config.auth.jwt.issuer.clone(),
            expiration_minutes: config.auth.jwt.expiration_minutes,
        }
    }

    pub fn sign(
        &self,
        sub: &str,
        scopes: &[String],
    ) -> Result<(String, u64), jsonwebtoken::errors::Error> {
        let now = chrono::Utc::now().timestamp() as u64;
        let claims = Claims {
            sub: sub.to_string(),
            scope: scopes.to_vec(),
            iss: self.issuer.clone(),
            iat: now,
            exp: now + self.expiration_minutes * 60,
        };
        let token = jsonwebtoken::encode(
            &jsonwebtoken::Header::default(),
            &claims,
            &jsonwebtoken::EncodingKey::from_secret(self.secret.as_bytes()),
        )?;
        Ok((token, self.expiration_minutes * 60))
    }

    /// Signature + expiry verification; failures map to `TOKEN_EXPIRED` upstream.
    pub fn verify(&self, token: &str) -> Result<AuthContext, jsonwebtoken::errors::Error> {
        let data = jsonwebtoken::decode::<Claims>(
            token,
            &jsonwebtoken::DecodingKey::from_secret(self.secret.as_bytes()),
            &jsonwebtoken::Validation::new(jsonwebtoken::Algorithm::HS256),
        )?;
        Ok(AuthContext {
            sub: data.claims.sub,
            scopes: data.claims.scope,
        })
    }
}

/// Constant-time comparison: both sides SHA-256 hashed first, matching the
/// reference implementation's comparison protocol.
pub fn secrets_equal(a: &str, b: &str) -> bool {
    let ha = Sha256::digest(a.as_bytes());
    let hb = Sha256::digest(b.as_bytes());
    ha.ct_eq(&hb).into()
}

#[derive(Debug)]
pub enum GrantError {
    InvalidRequest,
    InvalidClient,
    UnsupportedGrantType,
}

pub fn client_credentials_grant<'a>(
    access: &'a AccessConfig,
    client_id: &str,
    client_secret: &str,
) -> Result<&'a crate::config::OAuth2Client, GrantError> {
    access
        .oauth2
        .clients
        .iter()
        .find(|c| {
            secrets_equal(&c.client_id, client_id)
                && secrets_equal(&c.client_secret, client_secret)
                && c.grant_types.iter().any(|g| g == "client_credentials")
        })
        .ok_or(GrantError::InvalidClient)
}

pub fn password_grant<'a>(
    access: &'a AccessConfig,
    username: &str,
    password: &str,
) -> Result<&'a crate::config::OAuth2User, GrantError> {
    access
        .oauth2
        .users
        .iter()
        .find(|u| {
            u.username == username && bcrypt::verify(password, &u.password_hash).unwrap_or(false)
        })
        .ok_or(GrantError::InvalidClient)
}

pub fn lookup_static_token<'a>(
    access: &'a AccessConfig,
    token: &str,
) -> Option<&'a crate::config::StaticToken> {
    access
        .tokens
        .r#static
        .iter()
        .find(|t| secrets_equal(&t.token, token))
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
            Err(e) => {
                state.metrics.increment(
                    "excel_api_errors_total",
                    1.0,
                    &[("error", "TOKEN_EXPIRED")],
                );
                return err_body(
                    state.pretty,
                    StatusCode::UNAUTHORIZED,
                    "TOKEN_EXPIRED",
                    &e.to_string(),
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
        "Missing or invalid authentication",
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
