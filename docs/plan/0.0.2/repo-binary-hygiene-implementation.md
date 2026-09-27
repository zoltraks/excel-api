# Repository Binary Hygiene — Implementation Plan

**Change Request Reference**: `docs/change/0.0.2/repo-binary-hygiene.md`

**Best Practices**: `docs/standard/go-cli-development.md` (binaries to gitignored `bin/`); `docs/GUIDELINES.md` binary-output rule.

**Documentation Updates**: Verify `.gitignore` covers `excel-api-go/bin/` per the standard; root `.gitignore` gains stray-binary guards.

**Step by Step Implementation**:

1. **Untrack the binary**
   - `git rm --cached excel-api-go/excel-api-go` (and remove the file) — staging for the user-run commit.
   - Files: `excel-api-go/excel-api-go` (deleted).

2. **Ignore rules**
   - Root `.gitignore`: `excel-api-go/bin/` and stray top-level binary patterns; `excel-api-go/.gitignore`: `bin/` per the standard.
   - Files: `.gitignore`, `excel-api-go/.gitignore`.

3. **Verify**
   - `git ls-files` lists no executables; `go build -o bin/excel-api-go ./cmd/excel-api-go` produces the CLI.

**Testing Strategy**: None (repo hygiene); build check proves CLI still compiles.

**Verification**: `git ls-files` clean of binaries; `go build` succeeds.
