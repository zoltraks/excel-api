# Changes

## Version 0.0.3

Full audit-remediation release: hardened authentication, transport security, and rate limiting; interoperable file locking and batched write queues; configurable sheet header modes; contract-conformant responses and request validation across all three servers.

- **Contract**: Reconciled the `/ranges` path, added `RangeData` envelope and `CellData` ref/column/row fields, declared `LockStatus` fields, batch-operation schemas, and the `RATE_LIMITED`/`SERVICE_BUSY`/`FILE_LOCKED`/`SHEET_NOT_CONFIGURED`/`INVALID_REQUEST` error semantics
- **Authentication**: Implemented OAuth2 + static-token authentication in the C# server (previously absent) and hashed-password support in the Java authorization layer
- **TLS**: All three servers serve HTTPS from `server.tls` config and fail startup on missing certificate or key
- **CORS**: `server.cors.allowed_origins` is enforced on all servers; requests from unlisted origins receive no permissive headers
- **Rate limiting**: Fixed-window limiter per implementation with `429 RATE_LIMITED`; the token endpoint applies a stricter limit before authentication to blunt brute-force attempts
- **Security headers**: All servers emit `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, and `Referrer-Policy: no-referrer` on every response, including errors
- **Secret handling**: Constant-time credential comparison on all implementations (`timingSafeEqual` / `MessageDigest.isEqual` / `FixedTimeEquals`)
- **File locking**: Interoperable lockfile protocol across all three servers — atomic exclusive create, `locked_at`-based stale takeover, bounded acquisition timeout; lock-status endpoint reports real state including `queue_depth`
- **Write queue**: Per-workbook serialized write lanes with debounced batching and depth cap; excess depth is rejected with `503 SERVICE_BUSY`; record and cell batch endpoints apply all operations under one lock and one open/save cycle
- **Header modes**: `none`, `single`/`header_row`, `multi`/`multi_row`, and `legend`/`legend_sheet` resolve a per-sheet `SheetLayout` applied uniformly to reads, writes, batch operations, metadata, and column definitions; `SheetInfo.mode` maps to `table`/`raw` per the contract
- **Record indexing**: Canonical 1-based record index on all implementations — index 0 can no longer target the header row; `after_row`/`copy_style_from` use record-index basis; fixed off-by-one in Node insertion and Java header math
- **Request validation**: Required request fields validated via schema (Node), controller guards (Java), and presence-aware DTO checks (C#); missing data returns `INVALID_REQUEST` consistently
- **Metrics**: Valid Prometheus exposition on all servers — labeled samples, histogram `_bucket`/`_sum`/`_count`, request counters and durations, `excel_api_implementation_info`
- **Response parity**: C# emits snake_case JSON; error bodies match the contract's `ErrorResponse` on all servers
- **Integration suite**: Real contract-level assertions for auth, workbooks, sheets, records, batch operations, locking, concurrency, and the OpenAPI endpoint; writable fixture seeding via a named volume; `API_PATH` environment variable
- **Configuration**: C# consumes `logging.file.*` and `access.yaml` per the documented schema; removed the `LOGGING_FILE_*` bypass and unreachable type-classification code
- **Go CLI**: Token requests use URL-encoded form bodies and the configured HTTP timeout; workbook IDs, sheet names, and references are path-escaped
- **Compliance**: License inventory resolved across all manifests (npm, Maven, NuGet, Go) against the `docs/COPYRIGHTS.md` allowlist; flagged dispositions and the change-time license-review convention are recorded there; the Go CLI has no external dependencies
- **Containers**: Server Dockerfiles pin base images by digest and declare `HEALTHCHECK` against `/health`
- **Repository hygiene**: Removed the committed Go binary; ignore rules prevent stray binaries; binaries build to `bin/`
- **Documentation**: Directory layouts, fixture list, lockfile protocol, and the single-node scaling constraint reconciled against the settled tree; AI-provenance convention added to `docs/GUIDELINES.md`

## Version 0.0.2

Removed EXCEL_API_* prefixed environment variable fallbacks to simplify configuration across all implementations.

- **Configuration**: Removed EXCEL_API_WORK, EXCEL_API_CONFIG, EXCEL_API_ACCESS, and EXCEL_API_LIFE environment variable fallbacks from Java and C# implementations
- **Java ConfigLoader**: Fixed lifecycle resolution logic to use System.getenv("LIFE") instead of System.getProperty("LIFE", System.getenv("LIFE"))
- **Java Tests**: Removed incorrect environment variable test that used system property instead of environment variable
- **C# Tests**: Updated tests to remove EXCEL_API_* environment variable references
- **Documentation**: Added rule to VERSIONING.md about checking changes between versions when describing changes

## Version 0.0.1

Initial repository skeleton with project documentation, API contract, and implementation scaffolding.

- Established repository structure with five project directories: three API implementations (Node, Java, C#), one CLI client (Go), and an integration test suite
- Created project documentation: PROJECT.md, ARCHITECTURE.md, SPECIFICATION.md, GUIDELINES.md
- Created development standards for all four languages: TypeScript/Node, Java/Spring/Maven, C#/ASP.NET, Go CLI
- Defined OpenAPI 3.1 contract with dual addressing modes (cell-level and record-level)
- Added OAuth2 (password, client_credentials) and static token authorization to the API contract
- Created Dockerfile scaffolding for all four components
- Added docker-compose configuration for development and testing
- Added `sync-openapi.sh` script for synchronizing the contract across implementations
