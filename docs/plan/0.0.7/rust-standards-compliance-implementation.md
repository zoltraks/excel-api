# Implementation Plan - Rust Standards Compliance Alignment

## Change Request Reference

`docs/change/0.0.7/rust-standards-compliance-alignment.md`

## Best Practices

- `docs/standard/rust-general-development.md`
- `docs/standard/rust-api-development.md`
- `docs/GUIDELINES.md` - documentation ownership rules

## Documentation Updates

- `docs/standard/rust-api-development.md` - Project Conventions
- `docs/standard/rust-general-development.md` - structure/split rules
- `docs/TESTING.md` - Cross-Implementation Verification section
- `docs/WORKFLOW.md` - refactoring-hygiene bullet
- `shell/cross_test.py` - new tracked harness

## Step by Step Implementation

**rust-general vendored edits.** Mirror the canonical additions:
single-binary-crate as an approved shape; directory-module pattern for
oversized flat files; `pub(super)`/`pub(crate)` for sibling-shared
helpers; item-boundary cut guidance including `#[derive]`/`#[doc]` and
the revert-and-retry note. Edit in place; bump `Standards set:` token.

**rust-api Project Conventions.** Append: `Value`/`json!` exception for
heterogeneous contract-owned shapes; `err_body` named as the project
error mechanism; Jest suite as the HTTP-level test mechanism;
`include_str!` + `sync.sh` as the version-parity enforcement. Bump
`Standards set:` token.

**TESTING.md section.** "Cross-Implementation Verification" after the
integration-test block: shared-env recipe, port convention 4801-4804,
`--work`-relative config/access resolution, client-credentials token
acquisition, fixture-restore rule, matrix + lock-interop procedure via
`shell/cross_test.py`, artifact-staleness caveats.

**cross_test.py.** Adapt `work/itest/cross_test.py` into
`shell/cross_test.py`: stdlib only, ports via env/args (default
4801-4804), token acquisition, cell + record writer/reader matrix,
lock-status check, pass/fail summary. `chmod +x`.

**WORKFLOW.md bullet.** Refactoring section: scripted transforms cut at
item boundaries; corrupt scripted moves are reverted and retried.

## Testing Strategy

Documentation-only change - no component loops. `shell/cross_test.py`
is exercised live against the four running servers.

## Verification

`git diff --check`; table alignment in edited docs; live run of
`shell/cross_test.py` (ALL PASS expected); residual grep that no stale
file names survive in the source maps.
