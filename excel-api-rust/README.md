# Excel API - Rust Implementation

The Rust implementation of the Excel API. It serves the shared
`docs/contract/openapi.yaml` contract: workbook/sheet/record/cell reads,
queued serialized writes with file locking, OAuth2 + static-token auth,
scope ACLs, metrics, dynamic OpenAPI endpoints, TLS, CORS, and rate
limiting.

## Stack

- Rust (edition 2024, `rust-version = "1.89"`) on Tokio
- axum 0.8 + tower-http middleware
- `umya-spreadsheet` for workbook I/O (preserves formulas and styles
  across read-modify-write)
- `jsonwebtoken` (HS256), `bcrypt`, `sha2` + `subtle` for auth
- `axum-server` for optional TLS

## Build and Run

```bash
cargo build --release

./target/release/excel-api-rust --work /path/to/workdir
# or with explicit files
./target/release/excel-api-rust --config config/config.yaml --access config/access.yaml
```

Arguments: `--work`, `--config`, `--access`, `--life <duration>` (e.g.
`30s`, `5m`). Environment variables `WORK`, `CONFIG`, `ACCESS`, `LIFE`
match the arguments; `CONFIG_PROFILE` selects a config profile.

The working directory layout matches the other implementations:

```text
workdir/
  config/config.yaml     # server + registry config (see config/config.example.yaml)
  config/access.yaml     # credentials/ACL, must be mode 0600
  fixture/*.xlsx         # workbook files
  locks/                 # lockfiles
```

## Verification

```bash
cargo fmt --check --all
cargo clippy --all-targets -- -D warnings
cargo test
cargo build --release
```

## Docker

```bash
docker build -t excel-api-rust .
docker run -p 8443:8443 -v "$PWD/workdir:/work" excel-api-rust --work /work
```

## Behavior notes

- All blocking workbook/file work runs on `spawn_blocking`; request
  handlers never block Tokio worker threads.
- Writes are serialized per workbook lane with debounced batching; a
  single lock/open/save cycle executes a whole batch; capacity overflows
  return `SERVICE_BUSY`.
- The lockfile protocol is shared with the other implementations:
  atomic create, `locked_at` stale takeover, bounded timeout.
- Reads go through an mtime-invalidated parsed-workbook cache;
  `Cache-Control: no-cache` bypasses it.
- `/openapi.yaml` serves the contract with `info.title`,
  `info.description`, and `servers` replaced from `config.openapi`;
  `info.version` stays synchronized with the contract and crate version.
