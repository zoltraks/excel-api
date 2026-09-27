# CI Pipeline Acceptance

**Type**: Chore

**Summary**: No CI/CD configuration exists, so nothing runs builds, tests, or lint automatically. Per project decision, no hosted pipeline will be added — the manual verification loop in `docs/TESTING.md` is the accepted gate. Record that decision.

**Description**:

Audit finding FND-INF-001 / recommendation REC-014 — resolved by documented acceptance rather than implementation.

- Decision (owner-approved): the project does not adopt a hosted CI pipeline at this time.
- The manual verification loop in `docs/TESTING.md` (typecheck, lint, unit tests, static analysis, production build, security checks) is the required gate for every change and must be run before any release.
- No pipeline files are added to the repository.

## Out of Scope

- `.github/workflows`, `.gitlab-ci.yml`, or any pipeline configuration.
- Release automation.
