# CI Pipeline Acceptance — Implementation Plan

**Change Request Reference**: `docs/change/0.0.2/ci-acceptance.md`

**Best Practices**: `docs/TESTING.md` (manual verification loop is the accepted gate).

**Documentation Updates**: `docs/TESTING.md` — a short note recording the decision that no hosted CI is adopted and the manual loop is the required gate; `docs/WORKFLOW.md` if it implies an automated pipeline.

**Step by Step Implementation**:

1. **Record the decision**
   - `docs/TESTING.md`: add a brief note that no CI pipeline is configured by decision; the documented verification loop must be run for every change.
   - Files: `docs/TESTING.md`.

2. **Verify no pipeline artifacts**
   - Confirm no `.github/`, `.gitlab-ci.yml`, or pipeline file is added.

**Testing Strategy**: Documentation-only; no code.

**Verification**: Docs-only — verification loop not required.
