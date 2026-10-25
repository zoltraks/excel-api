# Rust Documentation Parity

## Type

Chore

## Summary

The Rust implementation shipped in 0.0.7, but several project documents
still describe a three-server project or omit the Rust component
entirely. A documentation audit found seventeen drifted sites; this
change repairs them, assigns single owners to the two duplicated rule
surfaces, and brings Rust coverage to parity wherever other stacks are
documented.

## Coverage

Documentation only - `AGENTS.md`, `README.md`, `docs/PROJECT.md`,
`docs/GUIDELINES.md`, `docs/WORKFLOW.md`, `docs/TESTING.md`,
`docs/ARCHITECTURE.md`, `docs/DEPLOYMENT.md`, `docs/REFACTORING.md`, and
`docs/standard/rust-general-development.md` +
`docs/standard/rust-api-development.md`. No source, configuration, or
test change.

## Description

- **Agent entry roster**: `AGENTS.md` lists five component directories
  and omits `excel-api-rust/`. The table must list all six.
- **Component count**: `docs/PROJECT.md` says "All five components" over
  a six-row table. The test-suite row also names Vitest while the suite
  runs Jest - correct both.
- **Parity rules**: `docs/GUIDELINES.md` and `docs/WORKFLOW.md` describe
  "three interchangeable server implementations" and enumerate
  "Node, Java, and C#" as the supported set. Rust belongs in every
  applicable-implementation rule and count.
- **Verification loop**: `docs/TESTING.md` carries no Rust stage in any
  loop step, no Rust security check, no Rust entry in the native
  unit-test framework list, and its integration example omits
  `excel-api-rust`. Rust needs the same rows the other stacks have,
  plus a toolchain environment note.
- **Remaining "three" claims**: `docs/REFACTORING.md` ("all three
  implementations"), `docs/ARCHITECTURE.md` (logging format and the
  A-01 decision row), and `docs/GUIDELINES.md` (SPECIFICATION
  enumeration) predate the fourth server.
- **Source layout map**: `docs/ARCHITECTURE.md` shows `excel.rs` and
  `routes/data.rs` as single files; both are module directories today.
  The map must reflect the real tree including `.cargo/audit.toml`.
- **Deployment count**: `docs/DEPLOYMENT.md` says all three
  implementations serve HTTPS - all four do.
- **Rust standards**: `docs/standard/rust-api-development.md` targets
  Rust 1.85+ and Tokio 1.40, and `docs/standard/rust-general-development.md`
  targets Rust 1.85+, while the crate pins `rust-version = "1.89"` and
  Tokio 1.54. Align with the pinned toolchain.
- **Testing standards**: `docs/PROJECT.md` has no Rust block in its
  per-component testing standards - add one matching the crate's
  `#[cfg(test)]` layout.
- **Owner declarations**: the sync-target list lives in both
  `shell/sync.sh` and the `docs/GUIDELINES.md` memorized rule - the
  script owns the list and the rule names the script. The verification
  loop lives in both `docs/TESTING.md` and `README.md` - `TESTING.md`
  owns the canonical loop and the README keeps quickstart commands with
  a pointer to it.
- **README parity**: the configuration-copy, custom-working-directory,
  and testing sections cover Node, Java, and C# only. Add the
  equivalent Rust blocks.

## Out of Scope

- Code changes of any kind, including `shell/sync.sh` edits.
- Version bumps and CHANGELOG entries.
- Documents under `docs/archive/`, `docs/refactoring/`, `docs/report/`,
  and earlier `docs/change`/`docs/plan` versions.
