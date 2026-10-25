// Operations route handlers.

use std::sync::Arc;

use axum::extract::{Path, State};
use axum::http::StatusCode;
use axum::response::Response;
use serde_json::{Map, Value, json};

use crate::error::json_body;
use crate::queue::{BatchOperation, OpVerb};
use crate::state::AppState;

use super::common::*;

pub async fn record_operations(
    State(state): State<Arc<AppState>>,
    Path((id, sheet_name)): Path<(String, String)>,
    axum::extract::Json(body): axum::extract::Json<Value>,
) -> Response {
    state
        .metrics
        .increment("excel_api_batch_record_requests_total", 1.0, &[]);
    let snap = match wb_or_404(&state, &id) {
        Ok(v) => v,
        Err(r) => return r,
    };
    if let Some(r) = readonly(&state, &snap) {
        return r;
    }
    let Some(ops_val) = body.get("operations").and_then(Value::as_array) else {
        return invalid_request(&state, "operations is required");
    };
    if ops_val.is_empty() {
        return invalid_request(&state, "operations must be a non-empty array");
    }
    let mut ops = Vec::with_capacity(ops_val.len());
    let mut labels = Vec::with_capacity(ops_val.len());
    let mut record_indices: Vec<Option<u32>> = Vec::with_capacity(ops_val.len());
    for item in ops_val {
        let op_name = item.get("op").and_then(Value::as_str).unwrap_or("");
        let verb = match op_name {
            "add" => OpVerb::Add,
            "update" => OpVerb::Update,
            "delete" => OpVerb::Delete,
            other => {
                return invalid_request(&state, &format!("invalid op: {other}"));
            }
        };
        let row_index = item
            .get("row_index")
            .and_then(Value::as_u64)
            .map(|v| v as u32);
        record_indices.push(row_index);
        labels.push(op_name.to_string());
        ops.push(BatchOperation {
            kind: "record",
            verb,
            sheet_name: sheet_name.clone(),
            cell_ref: None,
            record_index: if matches!(item.get("op").and_then(Value::as_str), Some("add")) {
                None
            } else {
                row_index
            },
            after_row: if matches!(item.get("op").and_then(Value::as_str), Some("add")) {
                row_index
            } else {
                None
            },
            copy_style_from: item
                .get("copy_style_from")
                .and_then(Value::as_u64)
                .map(|v| v as u32),
            data: item.get("data").cloned().unwrap_or(Value::Null),
        });
    }
    batch_result(&state, &snap, ops, labels, record_indices).await
}

pub async fn cell_operations(
    State(state): State<Arc<AppState>>,
    Path((id, sheet_name)): Path<(String, String)>,
    axum::extract::Json(body): axum::extract::Json<Value>,
) -> Response {
    state
        .metrics
        .increment("excel_api_batch_cell_requests_total", 1.0, &[]);
    let snap = match wb_or_404(&state, &id) {
        Ok(v) => v,
        Err(r) => return r,
    };
    if let Some(r) = readonly(&state, &snap) {
        return r;
    }
    let Some(ops_val) = body.get("operations").and_then(Value::as_array) else {
        return invalid_request(&state, "operations is required");
    };
    if ops_val.is_empty() {
        return invalid_request(&state, "operations must be a non-empty array");
    }
    let mut ops = Vec::with_capacity(ops_val.len());
    let mut labels = Vec::with_capacity(ops_val.len());
    for item in ops_val {
        let op_name = item.get("op").and_then(Value::as_str).unwrap_or("");
        let (verb, data) = match op_name {
            "update" | "write" => (
                OpVerb::Write,
                item.get("value").cloned().unwrap_or(Value::Null),
            ),
            "clear" => (OpVerb::Clear, Value::Null),
            other => {
                return invalid_request(&state, &format!("invalid op: {other}"));
            }
        };
        labels.push(op_name.to_string());
        ops.push(BatchOperation {
            kind: "cell",
            verb,
            sheet_name: sheet_name.clone(),
            cell_ref: item.get("ref").and_then(Value::as_str).map(String::from),
            record_index: None,
            after_row: None,
            copy_style_from: None,
            data,
        });
    }
    batch_result(&state, &snap, ops, labels, vec![None; ops_val.len()]).await
}

async fn batch_result(
    state: &AppState,
    snap: &WorkbookSnapshot,
    ops: Vec<BatchOperation>,
    labels: Vec<String>,
    record_indices: Vec<Option<u32>>,
) -> Response {
    let cfg = lane_config(state, snap);
    match state.queue.enqueue_batch(&cfg, ops).await {
        Ok(results) => {
            let mapped: Vec<Value> = results
                .iter()
                .enumerate()
                .map(|(i, r)| {
                    let mut entry = Map::new();
                    entry.insert(
                        "op".to_string(),
                        Value::String(labels.get(i).cloned().unwrap_or_default()),
                    );
                    entry.insert(
                        "status".to_string(),
                        Value::String(if r.success { "ok" } else { "error" }.to_string()),
                    );
                    let index = r
                        .data
                        .get("index")
                        .and_then(Value::as_u64)
                        .map(|v| v as u32)
                        .or(record_indices.get(i).copied().flatten());
                    if let Some(idx) = index {
                        entry.insert("index".to_string(), Value::from(idx));
                    }
                    if !r.success
                        && let Some(e) = &r.error
                    {
                        entry.insert("error".to_string(), Value::String(e.clone()));
                    }
                    Value::Object(entry)
                })
                .collect();
            json_body(
                StatusCode::OK,
                state.pretty,
                &json!({ "results": mapped, "applied_at": crate::util::utc_now_iso() }),
            )
        }
        Err(e) => err_enqueue(state, &e),
    }
}

// ---------- lock status ----------
