// Write operations and batch execution under the lockfile protocol.

use std::collections::HashMap;

use serde_json::{Map, Value, json};
use umya_spreadsheet::{Workbook, Worksheet};

use crate::config::SheetHeaderConfig;
use crate::queue::{BatchOperation, EnqueueError, LaneConfig, OpResult, OpVerb};
use crate::util::parse_cell_ref;

use super::layout::{SheetLayout, resolve_column_ids, resolve_layout};
use super::values::cell_data;
use super::{ExcelError, error_code, get_sheet, get_sheet_mut, load, save};

fn set_json_value(ws: &mut Worksheet, col: u32, row: u32, value: &Value) {
    let cell = ws.cell_mut((col, row));
    match value {
        Value::Null => {
            cell.cell_value_mut().set_blank();
        }
        Value::Bool(b) => {
            cell.set_value_bool(*b);
        }
        Value::Number(n) => {
            cell.set_value_number(n.as_f64().unwrap_or(0.0));
        }
        Value::String(s) => {
            cell.set_value_string(s.clone());
        }
        other => {
            cell.set_value_string(other.to_string());
        }
    }
}

pub fn apply_write_cell(
    ws: &mut Worksheet,
    cell_ref: &str,
    value: &Value,
) -> Result<Value, ExcelError> {
    let (col, row) = parse_cell_ref(cell_ref)
        .ok_or_else(|| ExcelError::Invalid(format!("cell reference '{cell_ref}'")))?;
    set_json_value(ws, col, row, value);
    let mut data = cell_data(ws, col, row, "native");
    data.insert(
        "formatted".to_string(),
        Value::String(ws.formatted_value((col, row))),
    );
    Ok(Value::Object(data))
}

pub fn apply_clear_cell(ws: &mut Worksheet, cell_ref: &str) -> Result<Value, ExcelError> {
    apply_write_cell(ws, cell_ref, &Value::Null)
}

pub fn apply_add_record(
    ws: &mut Worksheet,
    data: &Map<String, Value>,
    layout: &SheetLayout,
    ids: &[String],
    after_row: Option<u32>,
    copy_style_from: Option<u32>,
) -> Result<Value, ExcelError> {
    let (highest_col, highest_row) = ws.highest_column_and_row();
    let new_row = after_row.map_or(highest_row + 1, |r| layout.first_data_row + r);
    if after_row.is_some() && new_row <= highest_row {
        // Snapshot formulas before insert: umya rewrites cell references on
        // insert_new_row, but the contract keeps displaced rows identical.
        let mut formulas = Vec::new();
        for r in new_row..=highest_row {
            for c in 1..=highest_col {
                if let Some(cell) = ws.cell((c, r))
                    && cell.cell_value().is_formula()
                {
                    formulas.push((c, r, cell.cell_value().formula().to_string()));
                }
            }
        }
        ws.insert_new_row(new_row, 1);
        for (c, r, f) in formulas {
            ws.cell_mut((c, r + 1)).set_formula(f);
        }
    }
    for (i, header) in ids.iter().enumerate() {
        if header.is_empty() {
            continue;
        }
        if let Some(v) = data.get(header) {
            set_json_value(ws, (i + 1) as u32, new_row, v);
        }
    }
    if let Some(from) = copy_style_from {
        let style_row = layout.first_data_row + from - 1;
        for c in 1..=ids.len() as u32 {
            let style = ws.style((c, style_row)).clone();
            ws.set_style((c, new_row), style);
        }
    }
    Ok(json!({
        "index": new_row - layout.first_data_row + 1,
        "data": data,
    }))
}

pub fn apply_update_record(
    ws: &mut Worksheet,
    index: u32,
    data: &Map<String, Value>,
    layout: &SheetLayout,
    ids: &[String],
) -> Result<Value, ExcelError> {
    let (_, highest_row) = ws.highest_column_and_row();
    let excel_row = layout.first_data_row + index - 1;
    if index < 1 || excel_row > highest_row {
        return Err(ExcelError::OutOfRange(index));
    }
    for (i, header) in ids.iter().enumerate() {
        if header.is_empty() {
            continue;
        }
        if let Some(v) = data.get(header) {
            set_json_value(ws, (i + 1) as u32, excel_row, v);
        }
    }
    Ok(json!({ "index": index, "data": data }))
}

pub fn apply_delete_record(
    ws: &mut Worksheet,
    index: u32,
    layout: &SheetLayout,
) -> Result<(), ExcelError> {
    let (_, highest_row) = ws.highest_column_and_row();
    let excel_row = layout.first_data_row + index - 1;
    if index < 1 || excel_row > highest_row {
        return Err(ExcelError::OutOfRange(index));
    }
    ws.remove_row(excel_row, 1);
    Ok(())
}

fn apply_operation(
    book: &mut Workbook,
    op: &BatchOperation,
    sheets_cfg: &HashMap<String, SheetHeaderConfig>,
    ids_cache: &mut HashMap<String, Vec<String>>,
) -> Result<Value, ExcelError> {
    if !ids_cache.contains_key(&op.sheet_name) {
        let ws = get_sheet(book, &op.sheet_name)?;
        let layout = resolve_layout(sheets_cfg.get(&op.sheet_name));
        let ids = resolve_column_ids(book, ws, &layout)?;
        ids_cache.insert(op.sheet_name.clone(), ids);
    }
    let ids = ids_cache.get(&op.sheet_name).cloned().unwrap_or_default();
    let layout = resolve_layout(sheets_cfg.get(&op.sheet_name));
    let ws = get_sheet_mut(book, &op.sheet_name)?;
    match (op.kind, &op.verb) {
        ("cell", OpVerb::Clear) => apply_clear_cell(ws, op.cell_ref.as_deref().unwrap_or("")),
        ("cell", _) => apply_write_cell(ws, op.cell_ref.as_deref().unwrap_or(""), &op.data),
        ("record", OpVerb::Add) => apply_add_record(
            ws,
            op.data.as_object().unwrap_or(&Map::new()),
            &layout,
            &ids,
            op.after_row,
            op.copy_style_from,
        ),
        ("record", OpVerb::Delete) => {
            apply_delete_record(ws, op.record_index.unwrap_or(0), &layout)?;
            Ok(Value::Null)
        }
        ("record", _) => apply_update_record(
            ws,
            op.record_index.unwrap_or(0),
            op.data.as_object().unwrap_or(&Map::new()),
            &layout,
            &ids,
        ),
        _ => Err(ExcelError::Invalid(format!("operation kind '{}'", op.kind))),
    }
}

/// Execute one batch inside a single lock and a single open/save cycle.
/// Runs on the blocking pool.
pub fn execute_batch(
    cfg: &LaneConfig,
    ops: Vec<BatchOperation>,
) -> Result<Vec<OpResult>, EnqueueError> {
    cfg.lock
        .acquire(&cfg.file_id)
        .map_err(|e| EnqueueError::Locked(e.to_string()))?;

    let result = (|| -> Result<Vec<OpResult>, EnqueueError> {
        let mut book = load(&cfg.file_path).map_err(|e| EnqueueError::Internal(e.to_string()))?;
        let mut ids_cache: HashMap<String, Vec<String>> = HashMap::new();
        let mut results = Vec::with_capacity(ops.len());
        let mut any_success = false;
        for op in &ops {
            match apply_operation(&mut book, op, &cfg.sheets, &mut ids_cache) {
                Ok(data) => {
                    any_success = true;
                    results.push(OpResult::ok(data));
                }
                Err(e) => {
                    results.push(OpResult::err(e.to_string(), error_code(&e)));
                }
            }
        }
        if any_success {
            save(&book, &cfg.file_path).map_err(|e| EnqueueError::Internal(e.to_string()))?;
            cfg.cache.invalidate(&cfg.file_path);
        }
        Ok(results)
    })();

    cfg.lock.release(&cfg.file_id);
    result
}
