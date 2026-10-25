// Unauthenticated endpoints: health, metrics, OpenAPI spec, OAuth2 token.

use std::sync::Arc;

use axum::extract::State;
use axum::response::{IntoResponse, Response};
use serde::Deserialize;
use serde_json::json;

use crate::auth::GrantError;
use crate::error::err_body;
use crate::state::AppState;

pub async fn health(State(state): State<Arc<AppState>>) -> Response {
    crate::error::json_body(
        axum::http::StatusCode::OK,
        state.pretty,
        &json!({
            "status": "ok",
            "implementation": "excel-api-rust",
            "version": env!("CARGO_PKG_VERSION"),
            "uptime_seconds": state.started.elapsed().as_secs_f64(),
            "server_time": crate::util::utc_now_iso(),
            "timezone": iana_time_zone::get_timezone().unwrap_or_else(|_| "UTC".to_string()),
        }),
    )
}

pub async fn metrics(State(state): State<Arc<AppState>>) -> Response {
    (
        axum::http::StatusCode::OK,
        [("content-type", "text/plain; charset=utf-8")],
        state.metrics.to_open_metrics(),
    )
        .into_response()
}

pub async fn openapi_yaml(State(state): State<Arc<AppState>>) -> Response {
    (
        axum::http::StatusCode::OK,
        [("content-type", "application/yaml")],
        state.openapi_yaml.clone(),
    )
        .into_response()
}

pub async fn openapi_json(State(state): State<Arc<AppState>>) -> Response {
    crate::error::json_body(
        axum::http::StatusCode::OK,
        state.pretty,
        &serde_json::from_str::<serde_json::Value>(&state.openapi_json)
            .unwrap_or(serde_json::Value::Null),
    )
}

#[derive(Debug, Deserialize)]
pub struct TokenForm {
    pub grant_type: Option<String>,
    pub client_id: Option<String>,
    pub client_secret: Option<String>,
    pub username: Option<String>,
    pub password: Option<String>,
}

fn oauth_error(code: &str, description: &str) -> Response {
    crate::error::json_body(
        axum::http::StatusCode::BAD_REQUEST,
        false,
        &json!({ "error": code, "error_description": description }),
    )
}

pub async fn token(
    State(state): State<Arc<AppState>>,
    axum::extract::Form(form): axum::extract::Form<TokenForm>,
) -> Response {
    state
        .metrics
        .increment("excel_api_auth_token_requests_total", 1.0, &[]);
    let Some(grant_type) = form.grant_type.clone() else {
        return oauth_error("invalid_request", "grant_type is required");
    };
    let result: Result<(String, Vec<String>), GrantError> = match grant_type.as_str() {
        "client_credentials" => match (form.client_id, form.client_secret) {
            (Some(id), Some(secret)) => {
                crate::auth::client_credentials_grant(&state.access, &id, &secret)
                    .map(|c| (c.client_id.clone(), c.scopes.clone()))
            }
            _ => Err(GrantError::InvalidRequest),
        },
        "password" => match (form.username, form.password) {
            (Some(u), Some(p)) => crate::auth::password_grant(&state.access, &u, &p)
                .map(|u| (u.username.clone(), u.scopes.clone())),
            _ => Err(GrantError::InvalidRequest),
        },
        _ => Err(GrantError::UnsupportedGrantType),
    };
    match result {
        Ok((sub, scopes)) => match state.jwt.sign(&sub, &scopes) {
            Ok((access_token, expires_in)) => crate::error::json_body(
                axum::http::StatusCode::OK,
                state.pretty,
                &json!({
                    "access_token": access_token,
                    "token_type": "Bearer",
                    "expires_in": expires_in,
                    "scope": scopes.join(" "),
                }),
            ),
            Err(e) => err_body(
                state.pretty,
                axum::http::StatusCode::INTERNAL_SERVER_ERROR,
                "INTERNAL_ERROR",
                &e.to_string(),
            ),
        },
        Err(GrantError::InvalidRequest) => {
            oauth_error("invalid_request", "missing required grant parameters")
        }
        Err(GrantError::InvalidClient) => {
            oauth_error("invalid_client", "invalid client credentials")
        }
        Err(GrantError::UnsupportedGrantType) => {
            oauth_error("unsupported_grant_type", "grant_type is not supported")
        }
    }
}
