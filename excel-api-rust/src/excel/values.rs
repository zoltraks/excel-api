// Cell value extraction and JSON shaping (native/display/string formats).

use serde_json::{Map, Value, json};
use umya_spreadsheet::{CellRawValue, Worksheet};

use crate::util::{col_letter, parse_cell_ref};

use super::ExcelError;

fn is_date_format(code: &str, id: u32) -> bool {
    if (14..=22).contains(&id) || (45..=47).contains(&id) {
        return true;
    }
    let lc = code.to_lowercase();
    lc.contains('y') || lc.contains('d')
}

fn serial_to_iso(serial: f64) -> Option<String> {
    let base = chrono::NaiveDate::from_ymd_opt(1899, 12, 30)?;
    let days = serial.trunc() as i64;
    let secs = (serial.fract() * 86_400.0).round() as i64;
    let dt = base
        .and_hms_opt(0, 0, 0)?
        .checked_add_signed(chrono::Duration::days(days))?
        .checked_add_signed(chrono::Duration::seconds(secs))?;
    Some(dt.format("%Y-%m-%dT%H:%M:%S%.3fZ").to_string())
}

fn number_fmt(sheet: &Worksheet, col: u32, row: u32) -> (Option<String>, u32) {
    match sheet.cell((col, row)) {
        Some(cell) => match cell.style().number_format() {
            Some(nf) => (Some(nf.format_code().to_string()), nf.number_format_id()),
            None => (None, 0),
        },
        None => (None, 0),
    }
}

fn json_number(n: f64) -> Value {
    serde_json::Number::from_f64(n).map_or(Value::Null, Value::Number)
}

/// JSON value for a cell under the `native` format.
pub(crate) fn native_value(sheet: &Worksheet, col: u32, row: u32) -> (Value, &'static str) {
    let Some(cell) = sheet.cell((col, row)) else {
        return (Value::Null, "empty");
    };
    let cv = cell.cell_value();
    if cv.is_formula() {
        let result = match cv.raw_value() {
            CellRawValue::Numeric(n) => json_number(*n),
            CellRawValue::Bool(b) => Value::Bool(*b),
            CellRawValue::Empty => Value::Null,
            other => Value::String(other.to_string()),
        };
        return (
            json!({ "formula": cv.formula(), "result": result }),
            "formula",
        );
    }
    match cv.raw_value() {
        CellRawValue::Numeric(n) => {
            let (code, id) = number_fmt(sheet, col, row);
            if code.is_some_and(|c| is_date_format(&c, id)) {
                (serial_to_iso(*n).map_or(Value::Null, Value::String), "date")
            } else {
                (json_number(*n), "number")
            }
        }
        CellRawValue::Bool(b) => (Value::Bool(*b), "boolean"),
        CellRawValue::Empty => (Value::Null, "empty"),
        other => (Value::String(other.to_string()), "string"),
    }
}

pub(crate) fn value_as_string(sheet: &Worksheet, col: u32, row: u32) -> String {
    let (value, _) = native_value(sheet, col, row);
    match value {
        Value::Null => String::new(),
        Value::String(s) => s,
        other => other.to_string(),
    }
}

pub fn cell_data(sheet: &Worksheet, col: u32, row: u32, format: &str) -> Map<String, Value> {
    let (numfmt, _) = number_fmt(sheet, col, row);
    let is_formula = sheet
        .cell((col, row))
        .is_some_and(|c| c.cell_value().is_formula());
    let (mut value, value_type) = native_value(sheet, col, row);
    let mut formatted = Value::Null;
    if format == "display" {
        let text = sheet.formatted_value((col, row));
        value = Value::String(text.clone());
        formatted = Value::String(text);
    } else if format == "string" {
        value = Value::String(value_as_string(sheet, col, row));
    }
    let mut map = Map::new();
    map.insert(
        "ref".to_string(),
        Value::String(format!("{}{}", col_letter(col), row)),
    );
    map.insert("column".to_string(), Value::String(col_letter(col)));
    map.insert("row".to_string(), Value::from(row));
    map.insert("value".to_string(), value);
    map.insert("type".to_string(), Value::String(value_type.to_string()));
    map.insert(
        "number_format".to_string(),
        numfmt.map_or(Value::Null, Value::String),
    );
    map.insert("is_formula".to_string(), Value::Bool(is_formula));
    map.insert("formatted".to_string(), formatted);
    map
}

pub fn read_cell(
    sheet: &Worksheet,
    cell_ref: &str,
    format: &str,
) -> Result<Map<String, Value>, ExcelError> {
    let (col, row) = parse_cell_ref(cell_ref)
        .ok_or_else(|| ExcelError::Invalid(format!("cell reference '{cell_ref}'")))?;
    Ok(cell_data(sheet, col, row, format))
}

pub fn read_range(sheet: &Worksheet, range_ref: &str, format: &str) -> Result<Value, ExcelError> {
    let (start, end) = range_ref
        .split_once(':')
        .ok_or_else(|| ExcelError::Invalid(format!("range reference '{range_ref}'")))?;
    let (sc, sr) = parse_cell_ref(start)
        .ok_or_else(|| ExcelError::Invalid(format!("range reference '{range_ref}'")))?;
    let (ec, er) = parse_cell_ref(end)
        .ok_or_else(|| ExcelError::Invalid(format!("range reference '{range_ref}'")))?;
    if er < sr || ec < sc {
        return Err(ExcelError::Invalid(format!(
            "range reference '{range_ref}'"
        )));
    }
    let rows: Vec<Value> = (sr..=er)
        .map(|row| {
            let cells: Vec<Value> = (sc..=ec)
                .map(|col| Value::Object(cell_data(sheet, col, row, format)))
                .collect();
            json!({ "row": row, "cells": cells })
        })
        .collect();
    Ok(json!({ "range": range_ref, "rows": rows }))
}
