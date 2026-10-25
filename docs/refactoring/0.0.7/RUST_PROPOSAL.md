# Refactoring Proposal - Rust

## Scope

`excel-api-rust` - `src/queue.rs` exceeds the ~300-line module threshold.

## Problem

`src/queue.rs` is 332 lines and mixes two concerns: the operation/result
type vocabulary plus the `WriteQueue` API (lines 18-234), and the lane
execution machinery (`lane_loop`, `flush`, `clone_sheets`, lines
236-332). The vendored `rust-general-development` standard splits files
past ~300 lines.

## Goal

`queue.rs` becomes a `queue/` directory: `mod.rs` keeps the types and
`WriteQueue` (~230 lines), `lane.rs` holds the lane loop, flush, and
sheet-clone helper (~100 lines). No public API change - `crate::queue::*`
paths stay valid via `pub use`.

## Plan

1. `mkdir src/queue`; move `queue.rs` to `queue/mod.rs`.
2. Cut `lane_loop`, `flush`, `clone_sheets` verbatim (with their doc
   comments and attributes) into `queue/lane.rs`; declare
   `mod lane;` + `pub(crate) use` what callers need.
3. `cargo check` after each move - fix only imports/visibility.
4. `cargo fmt`, `cargo clippy --all-targets -- -D warnings`,
   `cargo test`, `cargo build --release`.

## Risk

Pure module move - visibility or import drift only. `cargo test` (13)
plus the live queue path via the running server cover it.

## Acceptance Criteria

- Both files under ~300 lines; `crate::queue::*` public surface
  unchanged (callers untouched).
- Clippy `-D warnings`, fmt, tests, release build all clean.
