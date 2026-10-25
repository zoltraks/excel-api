# Refactoring Proposal - excel-api-rust batch id cache

**Change window**: 0.0.5
**Component**: excel-api-rust
**Type**: Maintainability

## Problem

`apply_operation` in `src/excel.rs` cached `(SheetLayout, Vec<String>)`
per sheet but needed the layout re-resolved anyway, forcing a remove /
borrow / reinsert dance through `map_or_else` chains that obscured the
actual flow.

## Proposal

Cache only the resolved column-id vector per sheet name and resolve the
`SheetLayout` fresh per operation (it is a cheap struct derivation from
config). The cache exists to avoid re-reading header rows per op; layout
math is pure config.

## Risk

None. Same inputs, same outputs - the function contract is unchanged.

## Assessment - executed

- `apply_operation` now keeps `HashMap<String, Vec<String>>` of column
  ids and calls `resolve_layout` directly - the convoluted tuple
  extraction is gone.
- Verified: `cargo fmt --check`, `cargo clippy --all-targets --
  -D warnings`, `cargo test` (13 tests), `cargo build --release`, and
  the full Jest suite (26/26) against a live instance.
