// Records route handlers.

use std::collections::HashMap;
use std::sync::Arc;

use axum::extract::{Path, Query, Request, State};
use axum::http::StatusCode;
use axum::response::{IntoResponse, Response};
use serde_json::Value;

use crate::error::json_body;
use crate::excel;
use crate::queue::{BatchOperation, OpVerb};
use crate::state::AppState;
use umya_spreadsheet::Workbook;

use super::helpers::*;
use super::types::*;

fn read_records_inner(
    state: &AppState,
    snap: &WorkbookSnapshot,
    book: &Workbook,
    sheet_name: &str,
    offset: u32,
    limit: u32,
    format: &str,
) -> Result<Value, excel::ExcelError> {
    let ws = excel::get_sheet(book, sheet_name)?;
    let layout = excel::resolve_layout(snap.sheets.get(sheet_name));
    let ids = excel::resolve_column_ids(book, ws, &layout)?;
    let _ = state;
    Ok(excel::read_records(
        ws, &layout, &ids, offset, limit, format,
    ))
}

pub async fn list_records(
    State(state): State<Arc<AppState>>,
    Path((id, sheet_name)): Path<(String, String)>,
    query: Query<HashMap<String, String>>,
    request: Request,
) -> Response {
    state
        .metrics
        .increment("excel_api_records_list_requests_total", 1.0, &[]);
    let snap = match wb_or_404(&state, &id) {
        Ok(v) => v,
        Err(r) => return r,
    };
    let offset: u32 = query
        .0
        .get("offset")
        .and_then(|v| v.parse().ok())
        .unwrap_or(0);
    let limit: u32 = query
        .0
        .get("limit")
        .and_then(|v| v.parse().ok())
        .unwrap_or(100)
        .min(1000);
    let format = format_param(&query);
    let book = match load_book(&state, &snap, no_cache(&request)).await {
        Ok(b) => b,
        Err(r) => return r,
    };
    match read_records_inner(&state, &snap, &book, &sheet_name, offset, limit, &format) {
        Ok(v) => json_body(StatusCode::OK, state.pretty, &v),
        Err(e) => excel_err(&state, &e),
    }
}

pub async fn get_record(
    State(state): State<Arc<AppState>>,
    Path((id, sheet_name, index)): Path<(String, String, u32)>,
    query: Query<HashMap<String, String>>,
    request: Request,
) -> Response {
    state
        .metrics
        .increment("excel_api_record_get_requests_total", 1.0, &[]);
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
        let layout = excel::resolve_layout(snap.sheets.get(&sheet_name));
        let ids = excel::resolve_column_ids(&book, ws, &layout)?;
        excel::read_record(ws, &layout, &ids, index, &format)
    })();
    match result {
        Ok(v) => json_body(StatusCode::OK, state.pretty, &v),
        Err(e) => excel_err(&state, &e),
    }
}

pub async fn add_record(
    State(state): State<Arc<AppState>>,
    Path((id, sheet_name)): Path<(String, String)>,
    axum::extract::Json(body): axum::extract::Json<Value>,
) -> Response {
    state
        .metrics
        .increment("excel_api_record_add_requests_total", 1.0, &[]);
    let snap = match wb_or_404(&state, &id) {
        Ok(v) => v,
        Err(r) => return r,
    };
    if let Some(r) = readonly(&state, &snap) {
        return r;
    }
    let Some(data) = body.get("data").cloned() else {
        return invalid_request(&state, "data is required");
    };
    let op = BatchOperation {
        kind: "record",
        verb: OpVerb::Add,
        sheet_name,
        cell_ref: None,
        record_index: None,
        after_row: body
            .get("after_row")
            .and_then(Value::as_u64)
            .map(|v| v as u32),
        copy_style_from: body
            .get("copy_style_from")
            .and_then(Value::as_u64)
            .map(|v| v as u32),
        data,
    };
    match run_op(&state, &snap, op).await {
        Ok(result) => {
            if let Some(r) = op_failed(&state, &result) {
                return r;
            }
            json_body(StatusCode::CREATED, state.pretty, &result.data)
        }
        Err(r) => r,
    }
}

pub async fn update_record(
    State(state): State<Arc<AppState>>,
    Path((id, sheet_name, index)): Path<(String, String, u32)>,
    axum::extract::Json(body): axum::extract::Json<Value>,
) -> Response {
    state
        .metrics
        .increment("excel_api_record_update_requests_total", 1.0, &[]);
    let snap = match wb_or_404(&state, &id) {
        Ok(v) => v,
        Err(r) => return r,
    };
    if let Some(r) = readonly(&state, &snap) {
        return r;
    }
    let Some(data) = body.get("data").cloned() else {
        return invalid_request(&state, "data is required");
    };
    let op = BatchOperation {
        kind: "record",
        verb: OpVerb::Update,
        sheet_name,
        cell_ref: None,
        record_index: Some(index),
        after_row: None,
        copy_style_from: None,
        data,
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

pub async fn delete_record(
    State(state): State<Arc<AppState>>,
    Path((id, sheet_name, index)): Path<(String, String, u32)>,
) -> Response {
    state
        .metrics
        .increment("excel_api_record_delete_requests_total", 1.0, &[]);
    let snap = match wb_or_404(&state, &id) {
        Ok(v) => v,
        Err(r) => return r,
    };
    if let Some(r) = readonly(&state, &snap) {
        return r;
    }
    let op = BatchOperation {
        kind: "record",
        verb: OpVerb::Delete,
        sheet_name,
        cell_ref: None,
        record_index: Some(index),
        after_row: None,
        copy_style_from: None,
        data: Value::Null,
    };
    match run_op(&state, &snap, op).await {
        Ok(result) => {
            if let Some(r) = op_failed(&state, &result) {
                return r;
            }
            StatusCode::NO_CONTENT.into_response()
        }
        Err(r) => r,
    }
}

// ---------- cells ----------
