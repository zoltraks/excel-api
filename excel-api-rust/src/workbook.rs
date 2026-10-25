// Workbook registry: file ID resolution, per-sheet header config.

use std::collections::HashMap;
use std::path::PathBuf;

use crate::config::{Config, SheetHeaderConfig};

#[derive(Debug)]
pub struct WorkbookInfo {
    pub id: String,
    pub readonly: bool,
    pub path: PathBuf,
    pub sheets: HashMap<String, SheetHeaderConfig>,
}

pub struct WorkbookRegistry {
    workbooks: HashMap<String, WorkbookInfo>,
    order: Vec<String>,
}

impl WorkbookRegistry {
    /// Missing files are skipped with a warning, matching the reference
    /// implementations' startup behavior.
    pub fn new(config: &Config, warn: &dyn Fn(&str)) -> Self {
        let base = PathBuf::from(&config.registry.directory);
        let mut workbooks = HashMap::new();
        let mut order = Vec::new();
        for entry in &config.registry.workbooks {
            let full = base.join(&entry.path);
            if !full.exists() {
                warn(&format!("Workbook file not found: {}", full.display()));
                continue;
            }
            order.push(entry.id.clone());
            workbooks.insert(
                entry.id.clone(),
                WorkbookInfo {
                    id: entry.id.clone(),
                    readonly: entry.readonly,
                    path: full,
                    sheets: entry.sheets.clone(),
                },
            );
        }
        Self { workbooks, order }
    }

    pub fn get(&self, id: &str) -> Option<&WorkbookInfo> {
        self.workbooks.get(id)
    }

    pub fn all(&self) -> impl Iterator<Item = &WorkbookInfo> {
        self.order.iter().filter_map(|id| self.workbooks.get(id))
    }
}
