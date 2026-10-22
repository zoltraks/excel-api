# Node Toolchain Hygiene

**Type**: Chore

**Summary**: Three findings surfaced by the `excel-api-node` verification loop during the source-cleanup refactor: the `format` script fails repo-wide because no Prettier configuration exists, `npm audit` reports 22 vulnerabilities in the pinned dependency tree, and the test suite emits an `access.yaml` file-permission warning.

**Description**:

All three are baseline conditions, present on the untouched tree - none were introduced by the source cleanup.

- **Formatter configuration**: `package.json` runs `prettier --check .` but the package carries no `.prettierrc` (or equivalent), so Prettier's defaults apply - including double quotes, while the entire codebase uses single quotes. Roughly 50 files fail the check. Add a Prettier configuration matching the adopted style (single quotes), then reformat the tree in one pass so `npm run format` can gate changes.
- **Dependency vulnerabilities**: `npm audit` reports 22 findings (6 moderate, 11 high, 5 critical), including the `exceljs` -> `uuid` chain. Apply `npm audit fix` for compatible upgrades first, evaluate `exceljs` major-version impact separately, and keep the lockfile diff reviewable.
- **Config file permissions**: the test suite warns `access.yaml has insecure permissions: 644 (should be 600)`. Confirm whether the warning targets the checked-out example file, a fixture, or a mounted file, and set or document the expected mode.

## Out of Scope

- Source-layout changes (covered by `node-source-cleanup.md`).
- Replacing the dependency stack or upgrading Node/TypeScript majors beyond what audit remediation requires.
