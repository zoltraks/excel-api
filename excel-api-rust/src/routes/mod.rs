// Router assembly: unauthenticated service endpoints, scoped data endpoints,
// mounted at the configured base path and at root (parity with siblings).

use std::sync::Arc;

use axum::Router;
use axum::middleware::{from_fn, from_fn_with_state};
use axum::routing::{get, post, put};

use crate::state::AppState;

mod cells;
mod helpers;
mod lock_status;
mod operations;
mod records;
mod sheets;
mod system;
mod types;
mod workbooks;

pub fn router(state: Arc<AppState>) -> Router {
    let public = Router::new()
        .route("/health", get(system::health))
        .route("/metrics", get(system::metrics))
        .route("/openapi.yaml", get(system::openapi_yaml))
        .route("/openapi.json", get(system::openapi_json))
        .route("/auth/token", post(system::token));

    let reads = Router::new()
        .route("/workbooks", get(workbooks::list_workbooks))
        .route("/workbooks/{id}", get(workbooks::get_workbook))
        .route("/workbooks/{id}/sheets/{sheet}", get(sheets::get_sheet))
        .route(
            "/workbooks/{id}/sheets/{sheet}/columns",
            get(sheets::get_columns),
        )
        .route(
            "/workbooks/{id}/sheets/{sheet}/records",
            get(records::list_records),
        )
        .route(
            "/workbooks/{id}/sheets/{sheet}/records/{recordIndex}",
            get(records::get_record),
        )
        .route(
            "/workbooks/{id}/sheets/{sheet}/cells/{cellRef}",
            get(cells::get_cell),
        )
        .route(
            "/workbooks/{id}/sheets/{sheet}/ranges/{rangeRef}",
            get(cells::get_range),
        )
        .route_layer(from_fn_with_state(state.clone(), |s, req, next| async move {
            crate::auth::require_fn(s, req, next, "read", false).await
        }));

    let writes =
        Router::new()
            .route(
                "/workbooks/{id}/sheets/{sheet}/records",
                post(records::add_record),
            )
            .route(
                "/workbooks/{id}/sheets/{sheet}/records/{recordIndex}",
                put(records::update_record).delete(records::delete_record),
            )
            .route(
                "/workbooks/{id}/sheets/{sheet}/cells/{cellRef}",
                put(cells::write_cell),
            )
            .route(
                "/workbooks/{id}/sheets/{sheet}/operations",
                post(operations::record_operations),
            )
            .route(
                "/workbooks/{id}/sheets/{sheet}/cells/operations",
                post(operations::cell_operations),
            )
            .route_layer(from_fn_with_state(
                state.clone(),
                |s, req, next| async move {
                    crate::auth::require_fn(s, req, next, "write", false).await
                },
            ));

    let admin = Router::new()
        .route("/workbooks/{id}/lock-status", get(lock_status::lock_status))
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
        .layer(from_fn_with_state(
            state.clone(),
            crate::middleware::rate_limit,
        ))
        .layer(from_fn_with_state(
            state,
            crate::middleware::envelope_status,
        ))
}
