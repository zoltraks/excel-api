// Excel workbook operations on umya-spreadsheet.
// Mirrors the reference implementations' layout and value semantics.

pub mod layout;
pub mod ops;
pub mod records;
pub mod values;

pub use layout::*;
pub use ops::*;
pub use records::*;
pub use values::*;

use std::path::Path;

use umya_spreadsheet::{Workbook, Worksheet};

#[derive(Debug, thiserror::Error)]
pub enum ExcelError {
    #[error("Sheet '{0}' not found")]
    SheetNotFound(String),
    #[error("{0}")]
    NotConfigured(String),
    #[error("Record index {0} out of range")]
    OutOfRange(u32),
    #[error("Invalid {0}")]
    Invalid(String),
    #[error(transparent)]
    Io(#[from] umya_spreadsheet::XlsxError),
}

pub const fn error_code(err: &ExcelError) -> &'static str {
    match err {
        ExcelError::SheetNotFound(_) => "SHEET_NOT_FOUND",
        ExcelError::NotConfigured(_) => "SHEET_NOT_CONFIGURED",
        ExcelError::OutOfRange(_) => "ROW_NOT_FOUND",
        ExcelError::Invalid(_) => "VALIDATION_ERROR",
        ExcelError::Io(_) => "INTERNAL_ERROR",
    }
}

pub fn load(path: &Path) -> Result<Workbook, ExcelError> {
    Ok(umya_spreadsheet::reader::xlsx::read(path)?)
}

pub fn save(book: &Workbook, path: &Path) -> Result<(), ExcelError> {
    umya_spreadsheet::writer::xlsx::write(book, path)?;
    Ok(())
}

pub fn sheet_names(book: &Workbook) -> Vec<String> {
    book.sheet_collection()
        .iter()
        .map(|s| s.name().to_string())
        .collect()
}

pub fn get_sheet<'a>(book: &'a Workbook, name: &str) -> Result<&'a Worksheet, ExcelError> {
    book.sheet_by_name(name)
        .map_err(|_| ExcelError::SheetNotFound(name.to_string()))
}

fn get_sheet_mut<'a>(book: &'a mut Workbook, name: &str) -> Result<&'a mut Worksheet, ExcelError> {
    book.sheet_by_name_mut(name)
        .map_err(|_| ExcelError::SheetNotFound(name.to_string()))
}
