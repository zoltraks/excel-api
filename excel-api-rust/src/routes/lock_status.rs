// Lock_status route handlers.

use std::sync::Arc;

use axum::extract::{Path, State};
use axum::http::StatusCode;
use axum::response::Response;
use serde_json::json;

use crate::error::json_body;
use crate::state::AppState;

use super::types::*;

pub async fn lock_status(State(state): State<Arc<AppState>>, Path(id): Path<String>) -> Response {
    state
        .metrics
        .increment("excel_api_lock_status_requests_total", 1.0, &[]);
    let snap = match wb_or_404(&state, &id) {
        Ok(v) => v,
        Err(r) => return r,
    };
    let info = state.lock.lock_info(&snap.id);
    state.metrics.set_gauge(
        "excel_api_queue_depth",
        state.queue.depth(&snap.id) as f64,
        &[("workbook", &snap.id)],
    );
    json_body(
        StatusCode::OK,
        state.pretty,
        &json!({
            "locked": info.locked,
            "locked_by": info.locked_by,
            "locked_since": info.locked_since,
            "queue_depth": state.queue.depth(&snap.id),
        }),
    )
}
