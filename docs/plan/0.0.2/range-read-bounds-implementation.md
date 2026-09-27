# Range Read Bounds — Implementation Plan

**Change Request Reference**: `docs/change/0.0.2/range-read-bounds.md`

**Best Practices**: `docs/standard/ts-node-development.md`, `docs/standard/java-spring-maven-development.md`.

**Documentation Updates**: None — contract already declares full-range semantics.

**Step by Step Implementation**:

1. **Node: bounded iteration**
   - Parse `rangeRef` (`^[A-Z]{1,3}[0-9]+:[A-Z]{1,3}[0-9]+$`) into start/end column+row; iterate only the rectangle. Malformed input → contract error.
   - Files: `excel-api-node/src/excel/operations.ts`.

2. **Java: range parsing**
   - Replace `new CellReference("A1:C3")` single-cell parse with `AreaReference` (`org.apache.poi.ss.util.AreaReference`) or manual start/end parse; bound the loop to the rectangle.
   - Files: `excel-api-java/src/main/java/pl/alyx/api/excel/service/ExcelService.java`, `controller/CellController.java` if the param flows through.

3. **C# parity check**
   - Confirm `worksheet.Range(rangeRef)` already yields the bounded rectangle; adjust only if drifted.
   - Files: `excel-api-csharp/src/ExcelApi/Services/ExcelService.cs` (verify only).

4. **Tests**
   - Unit test per server: `A1:B2` → exactly 2x2; malformed ref → contract error.

**Testing Strategy**: Per-server unit tests; `integration-test-suite` adds the cross-server range spec.

**Verification**: `docs/TESTING.md` loop on Node + Java (and C# if touched).
