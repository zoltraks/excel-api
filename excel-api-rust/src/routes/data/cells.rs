// Cells route handlers.

use std::collections::HashMap;
use std::sync::Arc;

use axum::extract::{Path, Query, Request, State};
use axum::http::StatusCode;
use axum::response::Response;
use serde_json::{Map, Value};

use crate::error::json_body;
use crate::excel;
use crate::queue::{BatchOperation, OpVerb};
use crate::state::AppState;

use super::common::*;

pub async fn get_cell(
    State(state): State<Arc<AppState>>,
    Path((id, sheet_name, cell_ref)): Path<(String, String, String)>,
    query: Query<HashMap<String, String>>,
    request: Request,
) -> Response {
    state
        .metrics
        .increment("excel_api_cell_get_requests_total", 1.0, &[]);
    let snap = match wb_or_404(&state, &id) {
        Ok(v) => v,
        Err(r) => return r,
    };
    let format = format_param(&query);
    let book = match load_book(&state, &snap, no_cache(&request)).await {
        Ok(b) => b,
        Err(r) => return r,
    };
    let result = (|| -> Result<Map<String, Value>, excel::ExcelError> {
        let ws = excel::get_sheet(&book, &sheet_name)?;
        excel::read_cell(ws, &cell_ref, &format)
    })();
    match result {
        Ok(v) => json_body(StatusCode::OK, state.pretty, &Value::Object(v)),
        Err(e) => excel_err(&state, &e),
    }
}

pub async fn write_cell(
    State(state): State<Arc<AppState>>,
    Path((id, sheet_name, cell_ref)): Path<(String, String, String)>,
    axum::extract::Json(body): axum::extract::Json<Value>,
) -> Response {
    state
        .metrics
        .increment("excel_api_cell_write_requests_total", 1.0, &[]);
    let snap = match wb_or_404(&state, &id) {
        Ok(v) => v,
        Err(r) => return r,
    };
    if let Some(r) = readonly(&state, &snap) {
        return r;
    }
    let Some(value) = body.get("value").cloned() else {
        return invalid_request(&state, "value is required");
    };
    let op = BatchOperation {
        kind: "cell",
        verb: OpVerb::Write,
        sheet_name,
        cell_ref: Some(cell_ref),
        record_index: None,
        after_row: None,
        copy_style_from: None,
        data: value,
    };
    match run_op(&state, &snap, op).await {
        Ok(result) => {
            if let Some(r) = op_failed(&state, &result) {
                return r;
            }
            json_body(StatusCode::OK, state.pretty, &result.data)
        }
        Err(r) => r,
    }
}

pub async fn get_range(
    State(state): State<Arc<AppState>>,
    Path((id, sheet_name, range_ref)): Path<(String, String, String)>,
    query: Query<HashMap<String, String>>,
    request: Request,
) -> Response {
    state
        .metrics
        .increment("excel_api_range_get_requests_total", 1.0, &[]);
    let snap = match wb_or_404(&state, &id) {
        Ok(v) => v,
        Err(r) => return r,
    };
    let format = format_param(&query);
    let book = match load_book(&state, &snap, no_cache(&request)).await {
        Ok(b) => b,
        Err(r) => return r,
    };
    let result = (|| -> Result<Value, excel::ExcelError> {
        let ws = excel::get_sheet(&book, &sheet_name)?;
        excel::read_range(ws, &range_ref, &format)
    })();
    match result {
        Ok(v) => json_body(StatusCode::OK, state.pretty, &v),
        Err(e) => excel_err(&state, &e),
    }
}

// ---------- batch operations ----------
