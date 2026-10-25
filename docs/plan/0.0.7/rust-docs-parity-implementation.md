# Implementation Plan - Rust Documentation Parity

## Change Request Reference

`docs/change/0.0.7/rust-docs-parity.md`

## Best Practices

- `docs/STYLE.md` - documentation formatting rules
- `docs/standard/rust-general-development.md` and
  `docs/standard/rust-api-development.md` - Rust verification commands

## Documentation Updates

This change is documentation-only. The affected documents are the
deliverable itself:

- `AGENTS.md` - component roster
- `README.md` - component parity blocks
- `docs/PROJECT.md` - component count and test-suite stack
- `docs/GUIDELINES.md` - implementation counts and sync ownership
- `docs/WORKFLOW.md` - implementation enumerations
- `docs/ARCHITECTURE.md` - Rust source layout map
- `docs/TESTING.md` - verification loop, security checks, environment notes
- `docs/DEPLOYMENT.md` - implementation count
- `docs/REFACTORING.md` - implementation count
- `docs/standard/rust-general-development.md` and
  `docs/standard/rust-api-development.md` - toolchain targets

## Step by Step Implementation

**Repair the drift.** Correct every drifted site in place:
add the `excel-api-rust/` row to the `AGENTS.md` component table;
"five components" to six, Vitest to Jest (three sites), and a Rust
block in Testing Standards in `docs/PROJECT.md`;
"three" to "four" and the implementation enumerations in
`docs/GUIDELINES.md` (lines 67, 69, 112); the same enumeration plus
"all three implementations" in `docs/WORKFLOW.md` (lines 23, 36, 221);
the `excel.rs`/`routes/data.rs` entries to the real `excel/` and
`routes/data/` directory trees plus `.cargo/audit.toml`, the logging
format enumeration, and the A-01 decision row in
`docs/ARCHITECTURE.md`; "all three implementations serve HTTPS" in
`docs/DEPLOYMENT.md`; "all three implementations" in
`docs/REFACTORING.md`; the 1.85+/Tokio 1.40 targets to 1.89+/1.54 in
`docs/standard/rust-api-development.md` and the 1.85+ targets to 1.89+
in `docs/standard/rust-general-development.md`.

**Declare single owners.** In `docs/GUIDELINES.md` line 226, name
`shell/sync.sh` and its `TARGETS` list as the owner of the sync-target
locations instead of enumerating the paths. In `README.md`, add one
sentence at the head of "Testing Each Implementation" naming
`docs/TESTING.md` the owner of the canonical verification loop.

**Supplement to parity.** In `README.md`, add the Rust block under
"Creating Configuration Files", the Rust example under "Running with a
custom working directory", and a "Rust Implementation" section under
"Testing Each Implementation" using the commands verified in
`excel-api-rust/README.md`. In `docs/TESTING.md`, add a Rust
environment note (`rust-toolchain.toml` pin, `.cargo/audit.toml`
advisory ignores), the `cargo check` / `fmt`+`clippy` / `cargo test` /
clippy-lints / `cargo build --release` rows in the matching loop steps,
`#[test]`/`#[tokio::test]` in the native-framework list, `cargo audit`
under Security Checks, and `excel-api-rust` in the integration-test
image list.

## Testing Strategy

Documentation-only change - no unit or integration tests apply.
Accuracy of every documented command was verified against
`excel-api-rust/Cargo.toml`, `rust-toolchain.toml`, and
`excel-api-rust/README.md` during the audit.

## Verification

Documentation-only: `git diff --check` plus a `docs/STYLE.md` pass on
the edited regions (table alignment, heading and list conventions).
The component verification loop in `docs/TESTING.md` does not apply -
no source, configuration, or test file changes.
