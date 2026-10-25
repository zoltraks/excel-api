// Sheets route handlers.

use std::sync::Arc;

use axum::extract::{Path, Request, State};
use axum::http::StatusCode;
use axum::response::Response;
use serde_json::Value;

use crate::error::json_body;
use crate::excel;
use crate::state::AppState;

use super::helpers::*;
use super::types::*;

pub async fn get_sheet(
    State(state): State<Arc<AppState>>,
    Path((id, sheet_name)): Path<(String, String)>,
    request: Request,
) -> Response {
    state
        .metrics
        .increment("excel_api_sheet_get_requests_total", 1.0, &[]);
    let snap = match wb_or_404(&state, &id) {
        Ok(v) => v,
        Err(r) => return r,
    };
    let book = match load_book(&state, &snap, no_cache(&request)).await {
        Ok(b) => b,
        Err(r) => return r,
    };
    match excel::get_sheet(&book, &sheet_name) {
        Ok(ws) => {
            let layout = excel::resolve_layout(snap.sheets.get(&sheet_name));
            json_body(
                StatusCode::OK,
                state.pretty,
                &excel::sheet_metadata(ws, &layout),
            )
        }
        Err(e) => excel_err(&state, &e),
    }
}

pub async fn get_columns(
    State(state): State<Arc<AppState>>,
    Path((id, sheet_name)): Path<(String, String)>,
    request: Request,
) -> Response {
    state
        .metrics
        .increment("excel_api_columns_get_requests_total", 1.0, &[]);
    let snap = match wb_or_404(&state, &id) {
        Ok(v) => v,
        Err(r) => return r,
    };
    let book = match load_book(&state, &snap, no_cache(&request)).await {
        Ok(b) => b,
        Err(r) => return r,
    };
    let result = (|| -> Result<Value, excel::ExcelError> {
        let ws = excel::get_sheet(&book, &sheet_name)?;
        let layout = excel::resolve_layout(snap.sheets.get(&sheet_name));
        excel::column_definitions(&book, ws, &layout)
    })();
    match result {
        Ok(v) => json_body(StatusCode::OK, state.pretty, &v),
        Err(e) => excel_err(&state, &e),
    }
}

// ---------- records ----------
