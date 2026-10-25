# Rust API Implementation

## Type

Feature

## Summary

Add a fourth API server implementation in Rust at `excel-api-rust/` - axum
and tokio for the HTTP stack, `umya-spreadsheet` for workbook I/O - at full
contract parity with the three existing servers.

## Coverage

New implementation `excel-api-rust` plus the shared surfaces it must satisfy:
`docs/contract/openapi.yaml`, `excel-api-test`, compose and sync wiring, and
component documentation. The three existing servers are untouched.

## Description

The new server implements the complete contract, not a subset.

- **Endpoints**: every path in `docs/contract/openapi.yaml` with identical
  parameters, methods, and status codes.
- **Configuration**: identical `config.yaml`/`access.yaml` schema, including
  `server.json.pretty` (indented output via serde's pretty writer).
- **Authentication**: JWT validation, OAuth2 `client_credentials` and
  `password` grants, static `Token` header, scope-based ACL; failed Bearer
  validation returns `TOKEN_EXPIRED`; `UNAUTHORIZED`/`FORBIDDEN` envelopes
  match the contract.
- **Transport**: TLS from `server.tls`, CORS allowlist, fixed-window rate
  limiting with a stricter token-endpoint bucket (`429 RATE_LIMITED`), and
  the security headers on every response including errors.
- **Locking and writes**: the interoperable lockfile protocol (atomic
  exclusive create, `locked_at` stale takeover, bounded timeout),
  per-workbook serialized write queue with debounced batching,
  `batch_max_size` reject as `503 SERVICE_BUSY`, `FILE_LOCKED`,
  `READONLY_WORKBOOK`, `SHEET_NOT_CONFIGURED`.
- **Reads**: header modes (`single`/`multi`/`legend`/`none`), the `format`
  enum, canonical 1-based record indexing (index 0 is the header row).
- **Observability**: `/health` payload fields, `/metrics` OpenMetrics
  exposition, `/openapi.yaml` and `/openapi.json` serving the synced
  resource.
- **Workbook I/O**: `umya-spreadsheet` - the only Rust crate preserving
  formulas and styles across read-modify-write. `calamine` is read-only and
  `rust_xlsxwriter` rewrites files, losing fidelity the write queue must
  keep. A plan-phase spike verifies fixture fidelity (styled/formulas
  workbooks) before implementation commits.
- **Packaging**: `Dockerfile` (non-root, digest-pinned base image,
  `HEALTHCHECK` against `/health`), compose wiring, `config.example.yaml`,
  `README.md`, and a synced `resources/openapi.yaml` (the sync script gains
  the rust target).
- **Verification**: `cargo fmt --check`, `cargo clippy --all-targets --
  -D warnings`, `cargo test`, `cargo build --release` - zero warnings; the
  `excel-api-test` suite runs against the Rust server unchanged.
- **Versioning**: the `Cargo.toml` version field stays synchronized with
  the project version per `docs/VERSIONING.md`.

Engineering rules come from `docs/standard/rust-general-development.md` and
`docs/standard/rust-api-development.md`.

## Out of Scope

- Changes to the three existing implementations beyond sync wiring.
- Contract changes - a parity finding gets its own change request.
- The Go CLI and the integration suite's internals.
