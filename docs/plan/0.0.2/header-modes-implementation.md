# Header Modes — Implementation Plan

**Change Request Reference**: `docs/change/0.0.2/header-modes.md`

**Best Practices**: `docs/standard/ts-node-development.md`, `docs/standard/java-spring-maven-development.md`, `docs/standard/csharp-aspnet-development.md`. `docs/ARCHITECTURE.md` header-mode semantics are the spec.

**Documentation Updates**: `docs/ARCHITECTURE.md`/`docs/SPECIFICATION.md` — confirm documented `single`/`multi`/`legend`/`none` semantics and indexing convention (1-based) before coding.

**Step by Step Implementation**:

1. **Read the documented semantics**
   - Confirm mode definitions and the sheet-config schema (`mode`, `identifier_row`, `type_row`, `description_row`, `legend_sheet`) in ARCHITECTURE before writing code.

2. **Node**
   - Apply configured mode in `readRecords`/column metadata (replace hardcoded header row 1 and `mode: "raw"`); support identifier/type/description rows and legend_sheet.
   - Files: `excel-api-node/src/excel/operations.ts`, `src/routes/records.ts`, `src/services/` sheet-metadata path.

3. **Java**
   - Same, plus fix the 0-based `headerRowCount` off-by-one to match 1-based contract semantics.
   - Files: `excel-api-java/.../service/ExcelService.java`, `controller/RecordController.java`, `config/WorkbookConfig.java`.

4. **C#**
   - Same in `ReadRecords`/metadata paths.
   - Files: `excel-api-csharp/src/ExcelApi/Services/ExcelService.cs`.

5. **Cross-server consistency**
   - A `multi`-mode sheet yields identical columns/records across all three.

**Testing Strategy**: Per-server unit tests for each mode + a shared multi-mode fixture check; `integration-test-suite` sheets spec.

**Verification**: `docs/TESTING.md` loop on all three servers.
