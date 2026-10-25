// Shared helpers for the route handlers.

use std::collections::HashMap;
use std::sync::Arc;

use axum::extract::{Query, Request};
use axum::http::StatusCode;
use axum::response::Response;

use umya_spreadsheet::Workbook;

use crate::error::err_body;
use crate::excel;
use crate::queue::{BatchOperation, EnqueueError, LaneConfig, OpResult};
use crate::state::AppState;

use super::types::WorkbookSnapshot;
pub fn no_cache(request: &Request) -> bool {
    request
        .headers()
        .get("cache-control")
        .and_then(|v| v.to_str().ok())
        .is_some_and(|v| v.contains("no-cache"))
}

/// Load a workbook through the mtime cache on the blocking pool.
pub async fn load_book(
    state: &AppState,
    snap: &WorkbookSnapshot,
    bypass: bool,
) -> Result<Arc<Workbook>, Response> {
    if !bypass && let Some(book) = state.cache.get(&snap.path) {
        return Ok(book);
    }
    let path = snap.path.clone();
    let cache = state.cache.clone();
    let result = tokio::task::spawn_blocking(move || {
        excel::load(&path).map(Arc::new).map_err(|e| e.to_string())
    })
    .await;
    match result {
        Ok(Ok(book)) => {
            if !bypass {
                cache.set(&snap.path, book.clone());
            }
            Ok(book)
        }
        Ok(Err(e)) => Err(err_body(
            state.pretty,
            StatusCode::INTERNAL_SERVER_ERROR,
            "INTERNAL_ERROR",
            &format!("Failed to load workbook: {e}"),
        )),
        Err(e) => Err(err_body(
            state.pretty,
            StatusCode::INTERNAL_SERVER_ERROR,
            "INTERNAL_ERROR",
            &format!("Failed to load workbook: {e}"),
        )),
    }
}

pub fn excel_err(state: &AppState, err: &excel::ExcelError) -> Response {
    let (status, code) = match err {
        excel::ExcelError::SheetNotFound(_) => (StatusCode::NOT_FOUND, "SHEET_NOT_FOUND"),
        excel::ExcelError::NotConfigured(_) => (StatusCode::BAD_REQUEST, "SHEET_NOT_CONFIGURED"),
        excel::ExcelError::OutOfRange(_) => (StatusCode::NOT_FOUND, "ROW_NOT_FOUND"),
        excel::ExcelError::Invalid(_) => (StatusCode::BAD_REQUEST, "VALIDATION_ERROR"),
        excel::ExcelError::Io(_) => (StatusCode::INTERNAL_SERVER_ERROR, "INTERNAL_ERROR"),
    };
    state
        .metrics
        .increment("excel_api_errors_total", 1.0, &[("error", code)]);
    err_body(state.pretty, status, code, &err.to_string())
}

pub fn lane_config(state: &AppState, snap: &WorkbookSnapshot) -> LaneConfig {
    LaneConfig {
        file_id: snap.id.clone(),
        file_path: snap.path.clone(),
        sheets: snap.sheets.clone(),
        lock: state.lock.clone(),
        cache: state.cache.clone(),
    }
}

pub fn format_param(query: &Query<HashMap<String, String>>) -> String {
    query
        .0
        .get("format")
        .filter(|f| matches!(f.as_str(), "native" | "display" | "string"))
        .cloned()
        .unwrap_or_else(|| "native".to_string())
}

pub fn err_enqueue(state: &AppState, e: &EnqueueError) -> Response {
    match e {
        EnqueueError::QueueFull => {
            state
                .metrics
                .increment("excel_api_errors_total", 1.0, &[("error", "SERVICE_BUSY")]);
            err_body(
                state.pretty,
                StatusCode::SERVICE_UNAVAILABLE,
                "SERVICE_BUSY",
                "Too many queued writes for workbook",
            )
        }
        EnqueueError::Locked(m) => {
            state
                .metrics
                .increment("excel_api_errors_total", 1.0, &[("error", "FILE_LOCKED")]);
            err_body(state.pretty, StatusCode::CONFLICT, "FILE_LOCKED", m)
        }
        EnqueueError::Internal(m) => {
            state.metrics.increment(
                "excel_api_errors_total",
                1.0,
                &[("error", "INTERNAL_ERROR")],
            );
            err_body(
                state.pretty,
                StatusCode::INTERNAL_SERVER_ERROR,
                "INTERNAL_ERROR",
                m,
            )
        }
    }
}

pub fn op_failed(state: &AppState, result: &OpResult) -> Option<Response> {
    if result.success {
        return None;
    }
    let code = result.code.as_deref().unwrap_or("INTERNAL_ERROR");
    let status = match code {
        "SHEET_NOT_FOUND" | "ROW_NOT_FOUND" => StatusCode::NOT_FOUND,
        "SHEET_NOT_CONFIGURED" | "VALIDATION_ERROR" => StatusCode::BAD_REQUEST,
        _ => StatusCode::INTERNAL_SERVER_ERROR,
    };
    state
        .metrics
        .increment("excel_api_errors_total", 1.0, &[("error", code)]);
    Some(err_body(
        state.pretty,
        status,
        code,
        result.error.as_deref().unwrap_or("operation failed"),
    ))
}

pub async fn run_op(
    state: &AppState,
    snap: &WorkbookSnapshot,
    op: BatchOperation,
) -> Result<OpResult, Response> {
    let cfg = lane_config(state, snap);
    let rx = state
        .queue
        .enqueue(&cfg, op)
        .map_err(|e| err_enqueue(state, &e))?;
    match rx.await {
        Ok(Ok(result)) => Ok(result),
        Ok(Err(e)) => Err(err_enqueue(state, &e)),
        Err(_) => Err(err_body(
            state.pretty,
            StatusCode::INTERNAL_SERVER_ERROR,
            "INTERNAL_ERROR",
            "write queue dropped",
        )),
    }
}

pub fn readonly(state: &AppState, snap: &WorkbookSnapshot) -> Option<Response> {
    snap.readonly.then(|| {
        state.metrics.increment(
            "excel_api_errors_total",
            1.0,
            &[("error", "READONLY_WORKBOOK")],
        );
        err_body(
            state.pretty,
            StatusCode::UNPROCESSABLE_ENTITY,
            "READONLY_WORKBOOK",
            "Workbook is readonly",
        )
    })
}

pub fn invalid_request(state: &AppState, message: &str) -> Response {
    state.metrics.increment(
        "excel_api_errors_total",
        1.0,
        &[("error", "INVALID_REQUEST")],
    );
    err_body(
        state.pretty,
        StatusCode::BAD_REQUEST,
        "INVALID_REQUEST",
        message,
    )
}

pub fn file_stat(path: &std::path::Path) -> (String, u64) {
    match std::fs::metadata(path) {
        Ok(meta) => (crate::util::mtime_local(&meta), meta.len()),
        Err(_) => (String::new(), 0),
    }
}

pub fn info_filename(snap: &WorkbookSnapshot) -> String {
    snap.path
        .file_name()
        .map(|f| f.to_string_lossy().into_owned())
        .unwrap_or_default()
}
