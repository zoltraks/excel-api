# Range Path Reconciliation — Implementation Plan

**Change Request Reference**: `docs/change/0.0.2/range-path-reconcile.md`

**Best Practices**: Contract-first rule from `docs/GUIDELINES.md` — edit only `docs/contract/openapi.yaml`, then `shell/sync-openapi.sh`.

**Documentation Updates**: `docs/ARCHITECTURE.md` endpoint table if it lists the singular path; `docs/PROJECT.md` endpoint table (`/range` → `/ranges`).

**Step by Step Implementation**:

1. **Update the canonical contract**
   - Rename path `/workbooks/{fileId}/sheets/{sheetName}/range/{rangeRef}` → `.../ranges/{rangeRef}`.
   - Add `GET /openapi.json` (JSON serialization of the spec, same content as the YAML endpoint).
   - Files: `docs/contract/openapi.yaml`.

2. **Re-sync copies**
   - Run `shell/sync-openapi.sh`; verify the three `resources/` copies update byte-identically.

3. **Align docs**
   - `docs/ARCHITECTURE.md`, `docs/PROJECT.md` endpoint tables if they spell the singular path.

**Testing Strategy**: Contract-only change; verify served route tables already match (they serve `/ranges/` and `/openapi.json` today). No code change.

**Verification**: Diff the synced copies; confirm each server still serves both paths. No build/test loop needed (docs/contract only).
