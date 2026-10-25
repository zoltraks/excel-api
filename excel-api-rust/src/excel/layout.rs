// Sheet header layout resolution: single/multi/legend/none modes.

use umya_spreadsheet::{Workbook, Worksheet};

use crate::config::SheetHeaderConfig;
use crate::util::{col_index, col_letter};

use super::{ExcelError, get_sheet};

#[derive(Debug)]
pub struct SheetLayout {
    pub mode: String,
    pub identifier_row: u32,
    pub type_row: u32,
    pub description_row: u32,
    pub legend_sheet: Option<String>,
    pub first_data_row: u32,
}

pub fn resolve_layout(config: Option<&SheetHeaderConfig>) -> SheetLayout {
    let mode = config.map_or_else(|| "single".to_string(), |c| c.mode.clone());
    let identifier_row = if mode == "none" {
        0
    } else {
        config.and_then(|c| c.identifier_row).unwrap_or(1)
    };
    let type_row = config.and_then(|c| c.type_row).unwrap_or(0);
    let description_row = config.and_then(|c| c.description_row).unwrap_or(0);
    let first_data_row = if mode == "none" {
        1
    } else if mode == "legend" {
        identifier_row + 1
    } else {
        identifier_row.max(type_row).max(description_row) + 1
    };
    SheetLayout {
        mode,
        identifier_row,
        type_row,
        description_row,
        legend_sheet: config.and_then(|c| c.legend_sheet.clone()),
        first_data_row,
    }
}

pub(crate) fn cell_text(sheet: &Worksheet, col: u32, row: u32) -> String {
    sheet.value((col, row))
}

/// Column ids for a sheet: identifier row for single/multi, legend sheet
/// for legend mode, column letters for none mode.
pub fn resolve_column_ids(
    book: &Workbook,
    ws: &Worksheet,
    layout: &SheetLayout,
) -> Result<Vec<String>, ExcelError> {
    let (highest_col, _) = ws.highest_column_and_row();
    if layout.mode == "none" {
        return Ok((1..=highest_col).map(col_letter).collect());
    }
    if layout.mode == "legend" {
        let legend_name = layout.legend_sheet.clone().ok_or_else(|| {
            ExcelError::NotConfigured(format!(
                "Sheet '{}' is in legend mode but legend_sheet is not configured",
                ws.name()
            ))
        })?;
        let legend = get_sheet(book, &legend_name).map_err(|_| {
            ExcelError::NotConfigured(format!("Legend sheet '{legend_name}' is not configured"))
        })?;
        let (_, legend_rows) = legend.highest_column_and_row();
        let mut ids: Vec<String> = Vec::new();
        for r in 1..=legend_rows {
            let letter = cell_text(legend, 1, r);
            if letter.is_empty() {
                continue;
            }
            let raw = cell_text(legend, 2, r);
            let id = if raw.is_empty() { letter.clone() } else { raw };
            let idx = col_index(&letter);
            if idx > 0 && !id.is_empty() {
                let idx = idx as usize;
                if ids.len() < idx {
                    ids.resize(idx, String::new());
                }
                ids[idx - 1] = id;
            }
        }
        return Ok(ids);
    }
    let mut ids: Vec<String> = Vec::new();
    for c in 1..=highest_col {
        let text = cell_text(ws, c, layout.identifier_row);
        if !text.is_empty() {
            if ids.len() < c as usize {
                ids.resize(c as usize, String::new());
            }
            ids[(c - 1) as usize] = text;
        }
    }
    Ok(ids)
}
