// Router assembly: unauthenticated service endpoints, scoped data endpoints,
// mounted at the configured base path and at root (parity with siblings).

use std::sync::Arc;

use axum::Router;
use axum::middleware::{from_fn, from_fn_with_state};
use axum::routing::{get, post, put};

use crate::state::AppState;

pub mod data;
pub mod service;

pub fn router(state: Arc<AppState>) -> Router {
    let public = Router::new()
        .route("/health", get(service::health))
        .route("/metrics", get(service::metrics))
        .route("/openapi.yaml", get(service::openapi_yaml))
        .route("/openapi.json", get(service::openapi_json))
        .route("/auth/token", post(service::token));

    let reads = Router::new()
        .route("/workbooks", get(data::list_workbooks))
        .route("/workbooks/{id}", get(data::get_workbook))
        .route("/workbooks/{id}/sheets/{sheet}", get(data::get_sheet))
        .route(
            "/workbooks/{id}/sheets/{sheet}/columns",
            get(data::get_columns),
        )
        .route(
            "/workbooks/{id}/sheets/{sheet}/records",
            get(data::list_records),
        )
        .route(
            "/workbooks/{id}/sheets/{sheet}/records/{recordIndex}",
            get(data::get_record),
        )
        .route(
            "/workbooks/{id}/sheets/{sheet}/cells/{cellRef}",
            get(data::get_cell),
        )
        .route(
            "/workbooks/{id}/sheets/{sheet}/ranges/{rangeRef}",
            get(data::get_range),
        )
        .route_layer(from_fn_with_state(state.clone(), |s, req, next| async move {
            crate::auth::require_fn(s, req, next, "read", false).await
        }));

    let writes =
        Router::new()
            .route(
                "/workbooks/{id}/sheets/{sheet}/records",
                post(data::add_record),
            )
            .route(
                "/workbooks/{id}/sheets/{sheet}/records/{recordIndex}",
                put(data::update_record).delete(data::delete_record),
            )
            .route(
                "/workbooks/{id}/sheets/{sheet}/cells/{cellRef}",
                put(data::write_cell),
            )
            .route(
                "/workbooks/{id}/sheets/{sheet}/operations",
                post(data::record_operations),
            )
            .route(
                "/workbooks/{id}/sheets/{sheet}/cells/operations",
                post(data::cell_operations),
            )
            .route_layer(from_fn_with_state(
                state.clone(),
                |s, req, next| async move {
                    crate::auth::require_fn(s, req, next, "write", false).await
                },
            ));

    let admin = Router::new()
        .route("/workbooks/{id}/lock-status", get(data::lock_status))
        .route_layer(from_fn_with_state(state.clone(), |s, req, next| async move {
            crate::auth::require_fn(s, req, next, "admin", true).await
        }));

    let authed = Router::new()
        .merge(reads)
        .merge(writes)
        .merge(admin)
        .route_layer(from_fn_with_state(
            state.clone(),
            crate::auth::auth_middleware,
        ));

    let app = public.merge(authed).with_state(state.clone());

    let base = state.config.server.base_path.trim_matches('/').to_string();
    let app = if base.is_empty() {
        app
    } else {
        Router::new()
            .nest(&format!("/{base}"), app.clone())
            .merge(app)
    };

    let app = if state.config.server.cors.allowed_origins.is_empty() {
        app
    } else {
        let origins: Vec<axum::http::HeaderValue> = state
            .config
            .server
            .cors
            .allowed_origins
            .iter()
            .filter_map(|o| o.parse().ok())
            .collect();
        let cors = tower_http::cors::CorsLayer::new()
            .allow_origin(tower_http::cors::AllowOrigin::list(origins))
            .allow_methods([
                axum::http::Method::GET,
                axum::http::Method::POST,
                axum::http::Method::PUT,
                axum::http::Method::DELETE,
                axum::http::Method::OPTIONS,
            ])
            .allow_headers([
                axum::http::header::CONTENT_TYPE,
                axum::http::header::AUTHORIZATION,
            ]);
        app.layer(cors)
    };

    app.layer(from_fn(crate::middleware::security_headers))
        .layer(from_fn_with_state(
            state.clone(),
            crate::middleware::request_metrics_log,
        ))
        .layer(from_fn_with_state(state, crate::middleware::rate_limit))
}
