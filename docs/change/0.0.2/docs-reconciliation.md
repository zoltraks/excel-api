# Documentation Reconciliation

**Type**: Fix

**Summary**: `docs/ARCHITECTURE.md`, `docs/SPECIFICATION.md`, `docs/TESTING.md`, and `docs/WORKFLOW.md` describe directory layouts, test frameworks, env-var names, and the lockfile field that diverge from the sources. Reconcile the documents against the final post-remediation tree — run this change last.

**Description**:

Audit findings FND-ARC-007 and FND-ARC-005 / recommendations REC-022 and REC-030.

- `docs/ARCHITECTURE.md` and `docs/SPECIFICATION.md`: correct the per-implementation directory layouts to match the actual trees (e.g., Java `security/`/`controller/`/`service/` packages, Node route/lock/queue module names).
- `docs/TESTING.md`: fixture list must match `excel-api-test/fixture/` (no `large.xlsx`); framework names are Vitest, JUnit, MSTest, Jest (already corrected — verify against reality post-changes).
- `docs/WORKFLOW.md`: `IMPL=` → `IMAGE=` for the Compose test harness.
- Lockfile field name: document `locked_at` (the canonical field after `lockfile-protocol`).
- `docs/DEPLOYMENT.md`: document the single-node constraint — multi-replica deployment is unsupported with local file storage and advisory locks (FND-ARC-005).
- Every path and command named in the reconciled documents must resolve in the tree.
- Run after the code changes so docs describe the settled structure.

## Out of Scope

- New documentation documents; adjust existing files only.
