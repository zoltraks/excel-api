// Cross-cutting HTTP middleware: request logging/metrics, security headers,
// fixed-window rate limiting.

use std::net::SocketAddr;
use std::sync::Arc;
use std::time::Instant;

use axum::body::Body;
use axum::extract::{ConnectInfo, Request, State};
use axum::http::{HeaderValue, StatusCode};
use axum::middleware::Next;
use axum::response::Response;
use serde_json::json;

use crate::error::err_body;
use crate::state::AppState;

/// Per-request metrics counter + duration histogram + JSON access log.
pub async fn request_metrics_log(
    State(state): State<Arc<AppState>>,
    request: Request,
    next: Next,
) -> Response {
    let start = Instant::now();
    let method = request.method().to_string();
    let url = request.uri().to_string();
    let remote = request
        .extensions()
        .get::<ConnectInfo<SocketAddr>>()
        .map(|c| c.0.ip().to_string());
    let response = next.run(request).await;
    let elapsed = start.elapsed().as_secs_f64() * 1000.0;
    let status = response.status().as_u16().to_string();

    state.metrics.increment(
        "excel_api_http_requests_total",
        1.0,
        &[("method", &method), ("status", &status)],
    );
    state.metrics.observe(
        "excel_api_http_request_duration_ms",
        elapsed,
        &[("method", &method), ("status", &status)],
    );

    let record = json!({
        "level": "info",
        "date": chrono::Local::now().format("%Y-%m-%d").to_string(),
        "time": chrono::Local::now().format("%H:%M:%S%.3f").to_string(),
        "message": "Request completed",
        "request": { "method": method, "url": url },
        "response": { "statusCode": response.status().as_u16(), "responseTime": elapsed },
        "remote": remote,
    });
    state.logger.info(
        "Request completed",
        Some(json!({
            "request": { "method": method, "url": url },
            "response": { "statusCode": response.status().as_u16(), "responseTime": elapsed },
            "remote": remote,
        })),
    );
    if let Some(file) = &state.file_logger {
        file.log(&record);
    }
    response
}

/// Security headers on every response, including errors.
pub async fn security_headers(request: Request, next: Next) -> Response {
    let mut response = next.run(request).await;
    let headers = response.headers_mut();
    headers.insert(
        "x-content-type-options",
        HeaderValue::from_static("nosniff"),
    );
    headers.insert("x-frame-options", HeaderValue::from_static("DENY"));
    headers.insert("referrer-policy", HeaderValue::from_static("no-referrer"));
    response
}

/// Fixed-window rate limit: stricter bucket on the token endpoint.
pub async fn rate_limit(
    State(state): State<Arc<AppState>>,
    request: Request<Body>,
    next: Next,
) -> Response {
    let Some(global) = &state.global_limiter else {
        return next.run(request).await;
    };
    let ip = request
        .extensions()
        .get::<ConnectInfo<SocketAddr>>()
        .map_or_else(|| "unknown".to_string(), |c| c.0.ip().to_string());
    let is_token = request.method() == axum::http::Method::POST
        && request.uri().path().ends_with("/auth/token");
    let allowed = if is_token {
        state.token_limiter.as_ref().is_none_or(|l| l.hit(&ip))
    } else {
        global.hit(&ip)
    };
    if allowed {
        next.run(request).await
    } else {
        state
            .metrics
            .increment("excel_api_errors_total", 1.0, &[("error", "RATE_LIMITED")]);
        let mut resp = err_body(
            state.pretty,
            StatusCode::TOO_MANY_REQUESTS,
            "RATE_LIMITED",
            "Rate limit exceeded",
        );
        resp.headers_mut()
            .insert("retry-after", HeaderValue::from_static("60"));
        resp
    }
}
