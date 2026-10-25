# Rust Standards Compliance Alignment

## Type

Chore

## Summary

Adjust the vendored Rust engineering standards so the `excel-api-rust`
implementation is compliant by documentation: record intentional
project deviations in `Project Conventions`, fold in the generic
split/layout lessons learned during the source reorganization, and
persist the cross-implementation verification recipe in `TESTING.md`
plus a tracked `shell/cross_test.py` harness.

## Coverage

`docs/standard/rust-api-development.md`, `docs/standard/rust-general-development.md`,
`docs/TESTING.md`, `docs/WORKFLOW.md`, new `shell/cross_test.py`.
No code changes.

## Description

A session-review audit compared the implementation to both vendored
standards. Compliant as-is: file-per-route layout, one `mod.rs` router,
`types.rs` shared types, `spawn_blocking`, lint denies, toolchain pins,
single `include_str!` contract copy.

Intentional deviations recorded as conventions:

- `serde_json::json!`/`Value` used for heterogeneous contract-owned
  response shapes (cell values, batch results); concrete `Serialize`
  structs still preferred where a fixed shape exists.
- `err_body` helpers + status codes are the project error mechanism
  satisfying the "equivalent project error type" clause.
- HTTP-level coverage is delegated to the shared `excel-api-test` Jest
  suite; in-file `#[cfg(test)]` unit tests cover pure logic.
- Contract `info.version` parity is enforced structurally by
  `include_str!` embedding plus `sync.sh` stamping.

Generic lessons (also sent upstream to compass-skill canonical):

- A single binary crate is an approved layout; oversized modules split
  into directory modules (`config/`, `auth/`) with `mod.rs` + one file
  per concern; split helpers use `pub(super)`/`pub(crate)`.
- Module splits cut at item boundaries including `#[derive]`/`#[doc]`
  attributes; line-count-driven splits corrupt files and are reverted
  via `git checkout` and retried.

Durable artifacts:

- `TESTING.md` gains a Cross-Implementation Verification section:
  ports 4801-4804 (node/java/csharp/rust), shared fixture + lock dirs,
  `--work`-relative config/access paths, client-credentials token flow,
  fixture restore between suite runs, build-artifact caveats (Java
  `mvn package`, C# RID-specific output, `/health` version check).
- `shell/cross_test.py` ships the writer/reader + lock matrix as a
  maintained stdlib script (ports overridable).
- `WORKFLOW.md` gains one refactoring-hygiene bullet.

## Hints

- `Project Conventions` is the designated home for deviations - the
  normative rules stay untouched.
- Vendored copies are edited in place; canonical content is never
  copied over them wholesale.
