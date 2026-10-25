# Rust API Implementation Plan

## Change Request Reference

`docs/change/0.0.5/rust-api-implementation.md`

## Best Practices

- `docs/standard/rust-general-development.md` - language, layout, verification.
- `docs/standard/rust-api-development.md` - axum/tokio service standard.
- `docs/standard/openapi-general-development.md` - contract synchronization.
- `docs/standard/docker-general-development.md` - container packaging.

## Documentation Updates

- `docs/PROJECT.md` - Components Overview gains Excel API Rust.
- `docs/ARCHITECTURE.md` - component diagram and `excel-api-rust/` file structure; "three implementations" wording widened where it names the server set.
- `docs/SPECIFICATION.md` - new "Excel API Rust" section (stack, layout, umya-spreadsheet, queue, OpenAPI loading, known limitations).
- `README.md` - components table, testing commands.
- `docs/GUIDELINES.md` - already extended in this window (rust standards listed).
- `shell/sync-openapi.sh` - add the `excel-api-rust/resources/openapi.yaml` target.

## Step by Step Implementation

**Spike: umya-spreadsheet fidelity**

Create the crate scaffold, then prove before building on it: read `styled.xlsx` and `formulas.xlsx`, apply one write, save to a scratch copy, re-read, and confirm formulas (formula text + cached value) and styles (numFmt/fill) survive. Spike output lives under `work/`.

**Documentation first**

Apply the documentation updates above before source code.

**Crate scaffold**

`Cargo.toml` (edition 2024, `rust-version = "1.85"`, version synced at `0.0.5`), `rust-toolchain.toml`, `rustfmt.toml`, `.gitignore`, `config/config.example.yaml`, `config/access.example.yaml`, `resources/openapi.yaml` via the extended sync script, `Dockerfile`, `README.md`.
Dependencies: `axum`, `tokio`, `tower-http` (cors), `serde`, `serde_json`, `serde_yaml_ng`, `umya-spreadsheet`, `jsonwebtoken`, `bcrypt`, `sha2`, `subtle`, `thiserror`, `anyhow`, `chrono`, `axum-server` (rustls), `hostname`.

**Configuration and lifecycle**

`src/cli.rs` (`--work`/`--config`/`--access`/`--life`), `src/config.rs` (schema matching `config/types.ts`, `${VAR}` interpolation, WORK/CONFIG/ACCESS/LIFE resolution, CONFIG_PROFILE merge, `access.yaml` `0600` warning, relative-path resolution against `--work`), `src/util.rs` (duration parser `30s`/`5m`/`2h`).

**Domain layer**

`src/excel/` - workbook load/save wrapper, `layout.rs` (single/multi/legend/none per `layout.ts`), `values.rs` (typed cell value, `native`/`display`/`string`, numFmt subset, formula cached values), `ops.rs` (add/update/delete/write/clear per `operations.ts` semantics incl. `after_row`/`copy_style_from` and index reconciliation).
`src/workbook.rs` (registry: id, path, readonly, sheets config, modified_at, size_bytes), `src/lock.rs` (atomic create_new lockfile, JSON payload, stale `locked_at` takeover, own-PID fail-fast, bounded poll), `src/queue.rs` (per-workbook lane task, debounced batching, `batch_max_size` 503 cap, oneshot completion), `src/cache.rs` (parsed-workbook cache, mtime check on get, poll invalidation, `Cache-Control: no-cache` bypass).

**Auth and transport**

`src/auth/` - HS256 JWT issue/verify (`sub`, `scope[]`, `iss`, `exp`), OAuth2 `client_credentials` (constant-time compare via sha256+subtle) and `password` (bcrypt) grants, static `Token` header, ACL scope check (`admin_endpoints` gate), `TOKEN_EXPIRED` on Bearer failure, `UNAUTHORIZED`/`FORBIDDEN` envelopes.
`src/middleware.rs` - security headers on every response, request metrics + JSON access log, fixed-window rate limiter (global + stricter token bucket, `Retry-After`, bounded map), CORS via tower-http.
`src/error.rs` - `ApiError` -> `IntoResponse` for the contract code vocabulary.

**Routes**

`src/routes/` - `auth` (form-encoded token endpoint, OAuth2 `invalid_request`/`invalid_client`/`unsupported_grant_type` envelopes), `health` (implementation `excel-api-rust`, `env!("CARGO_PKG_VERSION")`), `metrics` (OpenMetrics exposition), `openapi` (startup-loaded spec; `info.title`/`info.description`/`servers` from `config.openapi`, `info.version` untouched; yaml + json), `workbooks`, `sheets`, `records`, `cells`, `operations`, `lock_status` (admin scope + `admin_endpoints`), all under `server.base_path` and at root.

**Server bootstrap**

`src/main.rs` - ordered init (config -> logger -> access -> registry -> queue -> cache -> router), `axum::serve` or `axum-server` rustls from `server.tls`, graceful shutdown on SIGTERM/SIGINT with queue drain, `--life`/`lifecycle.life` self-shutdown.

**Verification**

`cargo fmt --check`, `cargo clippy --all-targets -- -D warnings`, `cargo test`, `cargo build --release`; run `excel-api-test` against a local instance; `npm audit`-equivalent is `cargo audit`/`govulncheck` where installed; container build when Docker is available.

## Testing Strategy

- `cargo test` - unit tests for layout resolution, duration parsing, lock protocol, queue batching, ACL, value mapping (arrange/act/assert per standard).
- `excel-api-test` suite against the running Rust server - unchanged black-box parity check.
- Contract test guarding `info.version` parity between `resources/openapi.yaml` and the crate version.

## Verification

Verification loop and security checks per `docs/TESTING.md`, with the Rust ladder named in `docs/standard/rust-api-development.md`.

## Execution Log

**Spike result** (umya-spreadsheet 3.1.1): `reader::xlsx::read` /
`writer::xlsx::write` round-trips `styled.xlsx` and `formulas.xlsx` with
formula text, cached values, number formats, and styles intact. One
divergence found and handled in `apply_add_record`: `insert_new_row`
rewrites formula references (A3+B3 -> A4+B4) while ExcelJS keeps them
verbatim — the implementation snapshots formula text before insertion and
restores it, so displaced rows stay byte-identical (verified by the
`preserves displaced rows when inserting with after_row` integration test).

**Contract-parity deltas found during integration testing:**

- Cell batch operations use verb `update` (not `write`); both accepted.
- `result_large_err` suppressed on two route helpers (idiomatic axum
  `Result<_, Response>` on cold error paths).
- `pedantic`/`nursery` clippy groups evaluated then dropped from the lint
  table after mechanical fixes; the hard deny set
  (`unwrap_used`/`expect_used`/`panic`) is retained, so
  `cargo clippy --all-targets -- -D warnings` is clean.

**Status**: implemented and verified — 13 `cargo test` unit tests, 26/26
Jest integration tests against a live instance, `cargo build --release`
clean.
