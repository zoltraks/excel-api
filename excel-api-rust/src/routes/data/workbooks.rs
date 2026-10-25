// Workbooks route handlers.

use std::sync::Arc;

use axum::extract::{Path, Request, State};
use axum::http::StatusCode;
use axum::response::Response;
use serde_json::json;

use crate::error::json_body;
use crate::excel;
use crate::state::AppState;

use super::common::*;

pub async fn list_workbooks(State(state): State<Arc<AppState>>, request: Request) -> Response {
    state
        .metrics
        .increment("excel_api_workbooks_list_requests_total", 1.0, &[]);
    let bypass = no_cache(&request);
    let snaps: Vec<WorkbookSnapshot> = {
        let registry = state
            .registry
            .lock()
            .unwrap_or_else(std::sync::PoisonError::into_inner);
        registry.all().map(WorkbookSnapshot::of).collect()
    };
    let mut items = Vec::new();
    for snap in &snaps {
        let book = match load_book(&state, snap, bypass).await {
            Ok(b) => b,
            Err(resp) => return resp,
        };
        let (modified, size) = file_stat(&snap.path);
        let filename = info_filename(snap);
        items.push(json!({
            "id": snap.id,
            "filename": filename,
            "readonly": snap.readonly,
            "sheet_names": excel::sheet_names(&book),
            "modified_at": modified,
            "size_bytes": size,
        }));
    }
    let total = items.len();
    json_body(
        StatusCode::OK,
        state.pretty,
        &json!({ "items": items, "total": total }),
    )
}

pub async fn get_workbook(
    State(state): State<Arc<AppState>>,
    Path(id): Path<String>,
    request: Request,
) -> Response {
    state
        .metrics
        .increment("excel_api_workbook_get_requests_total", 1.0, &[]);
    let snap = match wb_or_404(&state, &id) {
        Ok(v) => v,
        Err(r) => return r,
    };
    let book = match load_book(&state, &snap, no_cache(&request)).await {
        Ok(b) => b,
        Err(r) => return r,
    };
    let (modified, size) = file_stat(&snap.path);
    let filename = info_filename(&snap);
    json_body(
        StatusCode::OK,
        state.pretty,
        &json!({
            "id": snap.id,
            "filename": filename,
            "readonly": snap.readonly,
            "sheet_names": excel::sheet_names(&book),
            "modified_at": modified,
            "size_bytes": size,
        }),
    )
}

// ---------- sheets ----------
