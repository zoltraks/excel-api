# Range Read Bounds

**Type**: Fix

**Summary**: Range reads ignore the requested end bound — Node iterates to the sheet's full extent and Java rejects the `A1:B2` syntax outright. Parse the full range in both servers so `GET .../ranges/A1:B2` returns exactly the requested rectangle.

**Description**:

Audit finding FND-CQY-002 / recommendation REC-011.

- Node `operations.ts`: split `rangeRef` into start/end coordinates and bound both row and column iteration to the declared rectangle.
- Java `ExcelService.java`: replace single-cell `CellReference` parsing with `AreaReference` (or explicit coordinate parsing) so `A1:B2`-style ranges resolve.
- C# already parses the full range via `worksheet.Range(rangeRef)` — verify parity only.
- Out-of-bounds and malformed `rangeRef` values must produce the contract error (`INVALID_REQUEST`/404 family as the contract specifies), not a 500.
- Accept: `GET .../ranges/A1:B2` returns exactly the 2x2 data in all three servers.

## Out of Scope

- The `RangeData` response envelope; covered by `response-schema-parity`.
