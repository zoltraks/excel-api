# Documentation Reconciliation — Implementation Plan

**Change Request Reference**: `docs/change/0.0.2/docs-reconciliation.md`

**Best Practices**: `docs/GUIDELINES.md` doc conventions; `docs/ARCHITECTURE.md`, `docs/SPECIFICATION.md`, `docs/TESTING.md`, `docs/WORKFLOW.md`, `docs/DEPLOYMENT.md` are the files reconciled.

**Documentation Updates**: This change IS the documentation update — reconcile all listed files to the settled tree.

**Step by Step Implementation**:

1. **Layout reconciliation**
   - `docs/ARCHITECTURE.md` and `docs/SPECIFICATION.md`: correct per-implementation directory layouts to match actual trees (Java `security/`/`controller/`/`service/`, Node module names, C# folders, Go layout).
   - Files: `docs/ARCHITECTURE.md`, `docs/SPECIFICATION.md`.

2. **Test doc accuracy**
   - `docs/TESTING.md`: fixture list matches `excel-api-test/fixture/`, framework names correct (Vitest/JUnit/MSTest/Jest).
   - Files: `docs/TESTING.md`.

3. **Workflow env names**
   - `docs/WORKFLOW.md`: `IMPL=` → `IMAGE=`; `docs/ARCHITECTURE.md` lockfile field `locked_at`.
   - Files: `docs/WORKFLOW.md`, `docs/ARCHITECTURE.md`.

4. **Single-node constraint**
   - `docs/DEPLOYMENT.md`: state that multi-replica deployment is unsupported with local file storage + advisory locks.
   - Files: `docs/DEPLOYMENT.md`.

5. **Sweep**
   - Every path/command named in the reconciled docs resolves in the tree.

**Testing Strategy**: Documentation-only; verified by path/command resolution sweep.

**Verification**: Docs-only — verification loop not required.
