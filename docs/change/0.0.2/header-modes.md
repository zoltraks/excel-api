# Header Modes

**Type**: Feature

**Summary**: All three loaders accept per-sheet header configuration (`mode`, `identifier_row`, `type_row`, `description_row`, `legend_sheet`) but every record path hardcodes header row 1, and `getSheetMetadata` reports `mode: "raw"` unconditionally. Apply the configured modes consistently.

**Description**:

Audit finding FND-ARC-004 / recommendation REC-020.

- Implement the declared modes `single`, `multi`, `legend`, `none` in record and column paths for all three servers, honoring `identifier_row`, `type_row`, `description_row`, and `legend_sheet` per the configuration schema.
- `getSheetMetadata` must report the configured mode rather than the hardcoded `"raw"`.
- Fix the Java indexing convention: `headerRowCount` must use the same 1-based contract semantics as Node and C# (POI `getRow` is 0-based — adjust at the boundary).
- Sheets without configuration keep the current default behavior (single header row).
- A `multi`-mode sheet must produce consistent `columns` and `records` responses across all three servers.
- `SHEET_NOT_CONFIGURED`-shaped behavior for unconfigured/mismatched modes must follow the contract error set.

## Hints

- Legend mode reads column definitions from a separate `legend_sheet`; check `docs/ARCHITECTURE.md` for the documented semantics before implementing.
