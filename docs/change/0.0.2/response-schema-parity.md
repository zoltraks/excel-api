# Response Schema Parity

**Type**: Fix

**Summary**: Response shapes diverge from the contract and across servers: `CellData` lacks `ref`/`column`/`row`, range reads return bare arrays instead of `RangeData`, `ColumnList` envelopes are missing in Java and C#, C# emits an out-of-enum `timespan` cell type, and Java/C# error responses are empty bodies. Align every response with the contract schemas so the three servers are interchangeable.

**Description**:

Audit finding FND-ARC-002 / recommendation REC-009.

- Every cell payload must emit `ref` (required by `CellData`) plus `column` and `row` where the schema declares them.
- Range reads must return the `RangeData` envelope `{range, rows: [{row, cells}]}` in all three servers.
- Java and C# column-list responses must return the `{source, columns}` envelope per `ColumnList`.
- C# `GetCellType` must map every cell to a type inside the contract enum — remove the `timespan` emission.
- All error responses must use the `{error, message, details?}` envelope: fix Java's empty `notFound()`/`unprocessableEntity()` bodies and C#'s empty `Results.StatusCode` responses.
- The `/auth/token` endpoint keeps its OAuth2/RFC-6749 response shape only where the contract declares it; verify against the contract error schema.

## Out of Scope

- New endpoints; covered by `batch-operations` and `range-path-reconcile`.
