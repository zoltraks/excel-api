# Rust Source Layout Reorganization

## Type

Chore

## Summary

Reorganize the `excel-api-rust` `src/` tree so every file owns one
concern: split the three oversized modules (`config.rs`, `auth.rs`,
`main.rs` bootstrap), dissolve the `routes/data/common.rs` grab-bag,
rename `service.rs` to `system.rs`, and merge `routes/data/` up into
`routes/`.

## Coverage

`excel-api-rust` only - module moves, no behavior change. Docs updated
to match the new tree.

## Description

The layout is evaluated against the vendored
`docs/standard/rust-api-development.md` structure rules: one file per
route group, shared types in `types.rs`, single-purpose files.

Conforming (kept): `excel/` domain module, `routes/mod.rs` router
composition, per-resource handler files.

Moved:

- `src/main.rs` -> slim entry + new `src/app.rs` composition root.
- `src/config.rs` -> `src/config/` with one file per section and
  `resolve.rs` for env interpolation and path resolution.
- `src/auth.rs` -> `src/auth/` split by mechanism (jwt, static_token,
  oauth, mod facade).
- `src/routes/data/common.rs` dissolves into `src/routes/types.rs`
  (WorkbookSnapshot, wb_or_404) and `src/routes/helpers.rs` (loaders,
  error mapping, file stat).
- `src/routes/service.rs` -> `src/routes/system.rs`.
- `src/routes/data/{workbooks,sheets,records,cells,operations,lock_status,mod}.rs`
  -> `src/routes/` (data/ level removed).

## Hints

- Pure module moves; `use` paths update mechanically. `cargo check`
  after each step keeps the refactor bisectable.
- `docs/ARCHITECTURE.md` and `docs/SPECIFICATION.md` source maps must
  be regenerated to the final tree.
- `workbook.rs` stays a flat file - the planned `workbook/` dir is
  skipped until it hosts a second module.
