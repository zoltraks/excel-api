// Shared error type and response envelope {error, message}.

use axum::http::StatusCode;
use axum::response::{IntoResponse, Response};
use serde_json::json;

pub fn json_body(status: StatusCode, pretty: bool, value: &serde_json::Value) -> Response {
    let body = if pretty {
        serde_json::to_string_pretty(value).unwrap_or_default()
    } else {
        serde_json::to_string(value).unwrap_or_default()
    };
    (status, [("content-type", "application/json")], body).into_response()
}

pub fn err_body(pretty: bool, status: StatusCode, code: &str, message: &str) -> Response {
    json_body(
        status,
        pretty,
        &json!({ "error": code, "message": message }),
    )
}
