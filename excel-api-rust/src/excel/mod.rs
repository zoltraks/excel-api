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
    #[error("Sheet '{0}' not found in workbook")]
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
    match umya_spreadsheet::reader::xlsx::read(path) {
        Ok(book) if !book.sheet_collection().is_empty() => Ok(book),
        _ => load_normalized(path),
    }
}

// Non-Excel writers (ClosedXML, others) emit the spreadsheetml namespace with
// an `x:` element prefix, which umya-spreadsheet does not match, so a
// foreign-saved workbook parses to an empty model. Rewrite the package in
// memory: drop the optional docProps parts and strip the `x:` element prefix
// from every XML part, then retry the read.
fn load_normalized(path: &Path) -> Result<Workbook, ExcelError> {
    use std::io::{Cursor, Read, Write};
    let raw = std::fs::read(path).map_err(umya_spreadsheet::XlsxError::Io)?;
    let mut archive = zip::ZipArchive::new(Cursor::new(raw))
        .map_err(|e| ExcelError::Invalid(format!("not a readable package: {e}")))?;
    let mut out = Cursor::new(Vec::new());
    {
        let mut writer = zip::ZipWriter::new(&mut out);
        for i in 0..archive.len() {
            let mut entry = archive
                .by_index(i)
                .map_err(|e| ExcelError::Invalid(format!("corrupt package: {e}")))?;
            if entry.is_dir() || entry.name().starts_with("docProps/") {
                continue;
            }
            let mut data = Vec::new();
            entry
                .read_to_end(&mut data)
                .map_err(umya_spreadsheet::XlsxError::Io)?;
            if (entry.name().ends_with(".xml") || entry.name().ends_with(".rels"))
                && let Ok(text) = String::from_utf8(data.clone())
            {
                data = text.replace("</x:", "</").replace("<x:", "<").into_bytes();
            }
            writer
                .start_file(entry.name(), zip::write::SimpleFileOptions::default())
                .map_err(|e| ExcelError::Invalid(format!("package rewrite: {e}")))?;
            writer
                .write_all(&data)
                .map_err(umya_spreadsheet::XlsxError::Io)?;
        }
        writer
            .finish()
            .map_err(|e| ExcelError::Invalid(format!("package rewrite: {e}")))?;
    }
    let bytes = out.into_inner();
    Ok(umya_spreadsheet::reader::xlsx::read_reader(
        &mut Cursor::new(bytes),
        true,
    )?)
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
