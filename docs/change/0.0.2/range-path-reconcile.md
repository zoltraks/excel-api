# Range Path Reconciliation

**Type**: Fix

**Summary**: The contract declares `/range/{rangeRef}` while all servers and the Go client serve `/ranges/{rangeRef}`, and every server exposes an undocumented `GET /openapi.json`. Reconcile the contract to reality: adopt `/ranges/` as canonical and declare `openapi.json`.

**Description**:

Audit finding FND-ARC-003 / recommendation REC-010.

- Edit `docs/contract/openapi.yaml`: rename `/workbooks/{fileId}/sheets/{sheetName}/range/{rangeRef}` to `.../ranges/{rangeRef}` (operation id, parameters, and summary stay).
- Declare `GET /openapi.json` in the contract with an appropriate response description (JSON serialization of the OpenAPI document).
- Run `shell/sync-openapi.sh` to propagate the contract to all three implementation copies.
- No route changes in servers or the Go client — implementations already use `/ranges/`.
- Accept: declared paths enumerate identically to each server's route table.

## Out of Scope

- The `RangeData` response-shape fix; covered by `response-schema-parity`.
- Range bound parsing; covered by `range-read-bounds`.
