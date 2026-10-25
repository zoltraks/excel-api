// Shared types for the route handlers.

use std::collections::HashMap;

use axum::http::StatusCode;
use axum::response::Response;

use crate::error::err_body;
use crate::state::AppState;
use crate::workbook::WorkbookInfo;

/// Clone of the workbook metadata needed by handlers (registry stays locked
/// only for the lookup).
#[derive(Clone)]
pub struct WorkbookSnapshot {
    pub id: String,
    pub path: std::path::PathBuf,
    pub readonly: bool,
    pub sheets: HashMap<String, crate::config::SheetHeaderConfig>,
}

impl WorkbookSnapshot {
    pub fn of(wb: &WorkbookInfo) -> Self {
        Self {
            id: wb.id.clone(),
            path: wb.path.clone(),
            readonly: wb.readonly,
            sheets: wb.sheets.clone(),
        }
    }
}

#[allow(clippy::result_large_err)]
// REASON: axum handlers return full Responses on the error path; boxing would
// obscure the idiomatic route-helper shape for a cold path.
pub fn wb_or_404(state: &AppState, id: &str) -> Result<WorkbookSnapshot, Response> {
    let registry = state.registry.lock().unwrap_or_else(|e| e.into_inner());
    match registry.get(id) {
        Some(wb) => Ok(WorkbookSnapshot::of(wb)),
        None => {
            state.metrics.increment(
                "excel_api_errors_total",
                1.0,
                &[("error", "WORKBOOK_NOT_FOUND")],
            );
            Err(err_body(
                state.pretty,
                StatusCode::NOT_FOUND,
                "WORKBOOK_NOT_FOUND",
                &format!("Workbook with ID '{id}' not found"),
            ))
        }
    }
}
