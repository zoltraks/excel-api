// Workbook registry entries and sheet header configuration.

use super::defaults::*;
use serde::Deserialize;
use std::collections::HashMap;

#[derive(Debug, Clone, Deserialize)]
pub struct SheetHeaderConfig {
    #[serde(default = "default_mode")]
    pub mode: String,
    pub identifier_row: Option<u32>,
    pub type_row: Option<u32>,
    pub description_row: Option<u32>,
    pub legend_sheet: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct WorkbookEntry {
    pub id: String,
    pub path: String,
    #[serde(default)]
    pub readonly: bool,
    #[serde(default)]
    pub sheets: HashMap<String, SheetHeaderConfig>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct RegistryConfig {
    pub directory: String,
    pub workbooks: Vec<WorkbookEntry>,
}
