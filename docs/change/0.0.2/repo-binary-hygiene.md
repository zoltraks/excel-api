# Repository Binary Hygiene

**Type**: Chore

**Summary**: A 7.5 MB compiled Linux ELF binary (`excel-api-go/excel-api-go`) is tracked in git contrary to the binary-placement rule, and `.gitignore` lacks the `bin/` entry the rule requires. Remove the binary and fix ignore rules.

**Description**:

Audit finding FND-INF-003 / recommendation REC-018.

- Remove `excel-api-go/excel-api-go` from tracking (`git rm`).
- Add `bin/` and any stray binary paths to `.gitignore` (per-component rules where the go standard requires them).
- Verify `git ls-files` lists no executables afterward.
- Confirm the documented build commands (`go build -o bin/...`) produce the CLI from a fresh checkout.
- The actual removal commit is performed by the user (no auto-commit).

## Out of Scope

- Release artifact publishing or checksum manifests (see `license-compliance` for provenance notes).
