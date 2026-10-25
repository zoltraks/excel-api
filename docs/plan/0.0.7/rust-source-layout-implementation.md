# Implementation Plan - Rust Source Layout Reorganization

## Change Request Reference

`docs/change/0.0.7/rust-source-layout-reorganization.md`

## Best Practices

- `docs/standard/rust-general-development.md`
- `docs/standard/rust-api-development.md`

## Documentation Updates

- `docs/ARCHITECTURE.md` - `excel-api-rust/` source map
- `docs/SPECIFICATION.md` - Rust source-layout listing

## Step by Step Implementation

**app.rs split.** Move bootstrap composition out of `main.rs` into
`src/app.rs` (`run()`); `main.rs` keeps arg parsing + call only.

**config/ dir.** `config.rs` -> `config/mod.rs` (AppConfig + load
entry), one file per struct family (server, tls, openapi, registry,
queue, cache, auth, logging), `resolve.rs` for env/path resolution.

**auth/ dir.** `auth.rs` -> `auth/mod.rs` facade + `jwt.rs`,
`static_token.rs`, `oauth.rs` by mechanism.

**common.rs dissolution.** `WorkbookSnapshot` + `wb_or_404` ->
`routes/types.rs`; `load_book`, `excel_err`, `err_enqueue`,
`op_failed`, `run_op`, `readonly`, `invalid_request`, `lane_config`,
`format_param`, `no_cache`, `file_stat`, `info_filename` ->
`routes/helpers.rs`.

**Route merges/renames.** `service.rs` -> `system.rs`;
`routes/data/*.rs` -> `routes/`; drop `data/mod.rs`, re-point
`routes/mod.rs` mounts.

**Doc maps.** Regenerate ARCHITECTURE/SPECIFICATION source trees.

Each step ends with `cargo check`; `cargo test` + `clippy` at the end.

## Testing Strategy

- `cargo test` (13 tests) + `cargo clippy -D warnings` must stay green.
- Live smoke: restart port 4804, health + workbooks + cell read/write.

## Verification

`docs/TESTING.md` Rust rows: `cargo fmt --check`, `cargo clippy`,
`cargo test`, `cargo build --release`; `git diff --check`.
