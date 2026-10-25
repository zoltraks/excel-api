// Tabular reads: records, sheet metadata, column definitions.

use serde_json::{Map, Value, json};
use umya_spreadsheet::{Workbook, Worksheet};

use crate::util::col_letter;

use super::ExcelError;
use super::layout::{SheetLayout, cell_text, resolve_column_ids};
use super::values::{native_value, value_as_string};

fn row_data(sheet: &Worksheet, row: u32, ids: &[String], format: &str) -> Map<String, Value> {
    let (highest_col, _) = sheet.highest_column_and_row();
    let mut data = Map::new();
    for c in 1..=highest_col {
        let Some(h) = ids.get((c - 1) as usize).filter(|h| !h.is_empty()) else {
            continue;
        };
        let (v, _) = native_value(sheet, c, row);
        let empty = matches!(&v, Value::Null) || matches!(&v, Value::String(s) if s.is_empty());
        if empty {
            continue;
        }
        let out = if format == "display" {
            Value::String(sheet.formatted_value((c, row)))
        } else if format == "string" {
            Value::String(value_as_string(sheet, c, row))
        } else {
            v
        };
        data.insert(h.clone(), out);
    }
    data
}

pub fn read_records(
    sheet: &Worksheet,
    layout: &SheetLayout,
    ids: &[String],
    offset: u32,
    limit: u32,
    format: &str,
) -> Value {
    let (_, highest_row) = sheet.highest_column_and_row();
    let total = if highest_row < layout.first_data_row {
        0
    } else {
        highest_row - layout.first_data_row + 1
    };
    let start = layout.first_data_row + offset;
    let end = (start + limit.saturating_sub(1)).min(highest_row);
    let mut items = Vec::new();
    if start <= end {
        for row in start..=end {
            items.push(json!({
                "index": row - layout.first_data_row + 1,
                "data": row_data(sheet, row, ids, format),
            }));
        }
    }
    json!({
        "items": items,
        "total": total,
        "offset": offset,
        "limit": limit,
        "format": format,
    })
}

pub fn read_record(
    sheet: &Worksheet,
    layout: &SheetLayout,
    ids: &[String],
    index: u32,
    format: &str,
) -> Result<Value, ExcelError> {
    let (_, highest_row) = sheet.highest_column_and_row();
    let excel_row = layout.first_data_row + index - 1;
    if index < 1 || excel_row > highest_row {
        return Err(ExcelError::OutOfRange(index));
    }
    Ok(json!({
        "index": index,
        "data": row_data(sheet, excel_row, ids, format),
    }))
}

pub fn sheet_metadata(sheet: &Worksheet, layout: &SheetLayout) -> Value {
    let (cols, rows) = sheet.highest_column_and_row();
    json!({
        "name": sheet.name(),
        "row_count": rows,
        "column_count": cols,
        "mode": if layout.mode == "none" { "raw" } else { "table" },
        "header_row": layout.identifier_row,
        "first_data_row": layout.first_data_row,
    })
}

pub fn column_definitions(
    book: &Workbook,
    ws: &Worksheet,
    layout: &SheetLayout,
) -> Result<Value, ExcelError> {
    let ids = resolve_column_ids(book, ws, layout)?;
    let mut columns = Vec::new();
    for (i, id) in ids.iter().enumerate() {
        if id.is_empty() {
            continue;
        }
        let col = (i + 1) as u32;
        let mut entry = Map::new();
        entry.insert("index".to_string(), Value::from(col));
        entry.insert("letter".to_string(), Value::String(col_letter(col)));
        entry.insert("id".to_string(), Value::String(id.clone()));
        let typ = if layout.type_row > 0 {
            let t = cell_text(ws, col, layout.type_row);
            if t.is_empty() {
                "string".to_string()
            } else {
                t
            }
        } else {
            "string".to_string()
        };
        entry.insert("type".to_string(), Value::String(typ));
        entry.insert("number_format".to_string(), Value::Null);
        entry.insert(
            "descriptions".to_string(),
            if layout.description_row > 0 {
                let desc = cell_text(ws, col, layout.description_row);
                if desc.is_empty() {
                    Value::Null
                } else {
                    json!({ "default": desc })
                }
            } else {
                Value::Null
            },
        );
        columns.push(Value::Object(entry));
    }
    let source = match layout.mode.as_str() {
        "legend" => "legend_sheet",
        "multi" => "multi_row",
        _ => "header_row",
    };
    Ok(json!({ "source": source, "columns": columns }))
}
