# Cross-Implementation File Interop

## Type

Fix

## Summary

A live four-server cross test (all implementations 0.0.7 on the same
`work/itest` fixture set, ports 4801-4804) found two
interoperability defects: the Node server 500s reading cells from files
saved by the C# or Rust writers, and the Rust server reports
`SHEET_NOT_FOUND` after another implementation modifies the workbook.

## Coverage

`excel-api-node` (read path), `excel-api-rust` (workbook reload/cache).
Java and C# readers verified clean against every writer.

## Description

Test setup: all four servers on `work/itest` (`simple.xlsx`, shared
`locks/`), OAuth via `test-client`. Each writer PUT a unique cell value;
every other implementation GET it back.

Evidence captured 2026-10-25:

- **Node read crash**: `GET /workbooks/simple/sheets/Sheet1/cells/Z12`
  on Node returns `500 Cannot read properties of undefined (reading
  'company')` for a file last saved by C# or Rust. Likely ExcelJS
  docProps/core property parsing on a foreign-saved file.
- **Rust stale read**: after the C# (or another foreign) write, Rust's
  `GET` on the same cell returns `404 SHEET_NOT_FOUND` for `Sheet1` -
  the parsed-workbook cache or reload path loses the sheet after an
  external modification.
- Cell matrix results: node->all OK, java->all OK,
  csharp->{node,rust} FAIL, rust->{node,csharp} FAIL plus rust's own
  write blocked by the stale-read defect.
- Record-update matrix was inconclusive (test-harness body shape, not
  an implementation failure) - rerun with `{"data": {...}}` after fixes.

## Hints

- Node: find the `.company` read in `excel-api-node/src` (workbook
  metadata path) and null-guard it.
- Rust: verify mtime/lock-time cache invalidation in `src/cache.rs` and
  reload in `src/excel/` after external modification; re-check sheet
  resolution on the reloaded workbook.
- Verification: rerun `work/itest/cross_test.py` - expect zero
  failures - plus the Jest suite against all four servers.
