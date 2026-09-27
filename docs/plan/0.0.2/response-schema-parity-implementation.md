# Response Schema Parity — Implementation Plan

**Change Request Reference**: `docs/change/0.0.2/response-schema-parity.md`

**Best Practices**: `docs/standard/ts-node-development.md`, `docs/standard/java-spring-maven-development.md`, `docs/standard/csharp-aspnet-development.md`.

**Documentation Updates**: `docs/SPECIFICATION.md` response-shape notes if they describe the divergent shapes; contract already declares the target.

**Step by Step Implementation**:

1. **CellData ref/column/row**
   - Emit `ref` (plus `column`/`row` per schema) in every cell payload in all three servers.
   - Files: `excel-api-node/src/excel/operations.ts` (cell DTO builders), `excel-api-java/.../dto/CellData.java` + serializers, `excel-api-csharp/src/ExcelApi/Dto/` + endpoint mappers.

2. **RangeData envelope**
   - Wrap range reads as `{range, rows:[{row, cells}]}` in Node and Java; verify C#.
   - Files: `excel-api-node/src/excel/operations.ts`, `excel-api-java/.../service/ExcelService.java`, `excel-api-csharp/.../ExcelService.cs`.

3. **ColumnList envelope**
   - Java and C# return `{source, columns}` (Node already conforms).
   - Files: Java `controller/SheetController`/`RecordController` + DTO; C# `Endpoints/` sheet endpoints.

4. **C# cell-type enum**
   - `GetCellType` must emit only contract enum values; remove the `timespan` emission.
   - Files: `excel-api-csharp/src/ExcelApi/Services/ExcelService.cs`.

5. **Error envelope everywhere**
   - Java `notFound()`/`unprocessableEntity()` and C# `Results.StatusCode` empty bodies → `{error, message, details?}`. Token endpoint keeps RFC-6749 only where contract declares.
   - Files: Java `GlobalExceptionHandler.java`/controllers, C# endpoints + exception middleware.

**Testing Strategy**: Per-server unit assertions on payload shapes; `integration-test-suite` adds schema-conformance checks.

**Verification**: `docs/TESTING.md` loop on all three servers.
