# Record Insert Integrity

**Type**: Fix

**Summary**: Record insertion with `after_row` writes into an existing row without shifting in all three servers, silently destroying row data. Shift existing rows down before populating the inserted row.

**Description**:

Audit finding FND-CQY-003 / recommendation REC-007.

- When `after_row` targets an occupied row, the server must insert a new row and shift existing rows down instead of overwriting.
- Node: `spliceRows` (ExcelJS). Java: `shiftRows` (POI). C#: `InsertRows`/`InsertRowsBelow` (ClosedXML).
- When `after_row` targets the end of data or an empty region, no shift is required and behavior stays as today.
- Cell styles of displaced rows must move with the rows (library shift semantics).
- Add a per-server unit test proving a mid-sheet insert preserves the displaced row's contents.

## Out of Scope

- Batch insert operations; covered by `batch-operations`.
