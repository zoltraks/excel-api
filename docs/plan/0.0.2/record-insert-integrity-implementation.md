# Record Insert Integrity — Implementation Plan

**Change Request Reference**: `docs/change/0.0.2/record-insert-integrity.md`

**Best Practices**: `docs/standard/ts-node-development.md`, `docs/standard/java-spring-maven-development.md`, `docs/standard/csharp-aspnet-development.md`.

**Documentation Updates**: None — `after_row` semantics are already documented; this makes the code match.

**Step by Step Implementation**:

1. **Node: shift on insert**
   - In the add-record path, when `after_row` targets an occupied row, call `worksheet.spliceRows(afterRow + 1, 0, [])` before populating so existing rows shift down. Keep append-fast-path when inserting past the end.
   - Files: `excel-api-node/src/excel/operations.ts`.

2. **Java: shift on insert**
   - Use `sheet.shiftRows(afterRow + 1, lastRow, 1)` before `createRow` when the target row is occupied (mirror the shift primitive `deleteRecord` already uses).
   - Files: `excel-api-java/src/main/java/pl/alyx/api/excel/service/ExcelService.java`.

3. **C#: shift on insert**
   - Use `worksheet.Row(afterRow).InsertRowsBelow(1)` (or `InsertRows` above target) before writing when the target row has data.
   - Files: `excel-api-csharp/src/ExcelApi/Services/ExcelService.cs`.

4. **Tests per server**
   - Unit test: insert with `after_row` mid-sheet → the displaced row's contents exist one row lower, intact.

**Testing Strategy**: Per-server unit test on the insert path; integration assertion lands in `integration-test-suite`.

**Verification**: `docs/TESTING.md` loop on all three server components. Security gate: routine (data-integrity fix, not auth).
