# Changes

## Version 0.0.8

Interoperability and documentation-parity release: cross-implementation file
compatibility fixes, response-field renames with a unified local-time
convention, a Rust source-layout reorganization, and engineering-standard
alignment.

- **Foreign-workbook interop**: Node and Rust now read `.xlsx` packages
  saved by any implementation - writers that emit `x:`-prefixed
  spreadsheetml elements (ClosedXML and others) produced empty models in
  ExcelJS and umya-spreadsheet; both implementations retry a failed load
  against an in-memory normalized package (`docProps/*` dropped, `x:`
  prefixes stripped)
- **Response field renames**: `timezone` is now `zone`, `modified_at` is
  `modified`, `size_bytes` is `size` across health and workbook responses
  on all four servers, the contract, and the Go client; all timestamps use
  `YYYY-MM-DD hh:mm:ss.fff` local server time
- **Java fix**: `GET /workbooks` and `GET /workbooks/{id}` resolve
  registry paths once - the double join made the list empty and detail
  return `WORKBOOK_NOT_FOUND`; `filename` now reports the basename like
  the other servers
- **Rust reorganization**: `src/` refactored into single-concern modules -
  `app.rs` composition root, `config/`, `auth/`, and `queue/` directory
  modules, `routes/` flattened with `types.rs`/`helpers.rs` shared files
- **Documentation parity**: live docs corrected to the real six-component
  roster and Rust toolchain; `docs/TESTING.md` gains the
  cross-implementation verification procedure (ports 4801-4804, shared
  fixture/lock environment) plus the tracked `shell/cross_test.py`
  harness
- **Standards alignment**: vendored engineering standards use
  minimum-version floors instead of pinned runtimes, record the project's
  deliberate Rust conventions, and sync `openapi-general` to canonical
  0.1.5; `docs/GUIDELINES.md` gains the API-conventions section
- **Refactoring**: C# nullability warnings eliminated for a zero-warning
  Release build; Rust `queue.rs` split under the file-size threshold

## Version 0.0.7

Parity and conformance release: version-source consolidation, health response renames, per-endpoint metrics, serialization order, and implementation-specific bug fixes across all four servers.

- **Version source**: `docs/contract/openapi.yaml` `info.version` is now the single authoritative version; `shell/sync.sh` (renamed from `sync-openapi.sh`) propagates the contract to all `resources/openapi.yaml` copies with a generated marker and stamps the version into every carrier; Java and C# `/health` and `/openapi.*` read the version from the embedded synced contract instead of literals
- **Health response**: all four servers return `status`, `implementation`, `version`, `uptime`, `time`, `timezone`; the contract's `HealthResponse` schema is updated and `uptime` is required
- **Java fixes**: sheet and record endpoints no longer 401/500 on `sheets`-less workbooks (null-safe `getSheetConfig`, permitted error dispatch, `NoResourceFoundException` -> 404, domain error codes); workbook paths resolve against `registry.directory`; deleting the last data row and inserting with `after_row` preserve POI formulas verbatim
- **C# fixes**: record writes preserve JSON value types instead of stringifying `JsonElement`; missing sheets return `404 SHEET_NOT_FOUND` via `SheetNotFoundException`/`TryGetWorksheet`
- **Config parity**: Java binds `server.port`, `server.host`, and `server.base_path` to the embedded web server and applies `CONFIG_PROFILE` merges; C# gains the same top-level `profiles:`/`CONFIG_PROFILE` merge; `/auth/token` accepts both form-urlencoded and JSON on all four servers
- **Serialization parity**: Rust enables `serde_json` `preserve_order`; Java emits `error`-then-`message` envelope order and a compact `"key": "value"` pretty separator; `/health` reports the timezone through the shared TZ env -> `/etc/localtime` -> platform-default precedence
- **Metrics parity**: the documented canonical family set now ships on all four servers - per-endpoint `requests_total`/`duration_ms`, `errors_total`, and `queue_depth` (Java also wires the metrics filter output to `/metrics`)

## Version 0.0.6

Feature release: a fourth server implementation in Rust, a Fastify 5 major upgrade for the Node server, and version-source refactoring.

- **Excel API Rust** (`excel-api-rust/`): new implementation on axum/Tokio with umya-spreadsheet workbook I/O - full contract parity (records, cells, ranges, batch operations, lock status, metrics, OAuth2 + static-token auth, scope ACLs, TLS, CORS, rate limiting, mtime cache), per-workbook serialized write lanes with debounced batching, the shared lockfile protocol, digest-pinned non-root Dockerfile, and synchronized `resources/openapi.yaml` via `shell/sync-openapi.sh`
- **Fastify 5**: `excel-api-node` upgrades `fastify` to 5.12 and `@fastify/cors` to 11, eliminating the `find-my-way` advisory chain; the documented Node floor is aligned to the Node 22 baseline already enforced by engines and Docker
- **Version source refactor**: `excel-api-node` `/health` and `/openapi.*` now report `PACKAGE_VERSION` from `package.json` instead of a stale literal; Java and C# version literals are resynchronized to the release

## Version 0.0.5

Feature and parity release: configurable pretty-printed JSON on all three servers, expired-token error parity, and dependency security upgrades.

- **JSON pretty responses**: `server.json.pretty` in `config.yaml` enables two-space indented JSON output on every response - Node via an `onSend` serialization hook, Java via a `Jackson2ObjectMapperBuilderCustomizer` shared by MVC converters and filters, C# via `JsonSerializerOptions.WriteIndented`; compact output remains the default
- **Error parity**: `TOKEN_EXPIRED` is now the documented code for failed Bearer-token validation on all three servers - Java maps the failed-filter marker through the authentication entry point, C# distinguishes the Bearer scheme in `AuthMiddleware`; the contract's `ErrorResponse` documents the full code vocabulary
- **Dependencies**: `excel-api-node` upgrades `zod` to 4 and `uuid` to 11 with `tar`/`fflate` remediations and explicit `overrides`; residual `find-my-way`/Fastify findings are deferred to the Fastify 5 migration (Node 20+ floor) tracked in `docs/change/0.0.5/`
- **Examples**: `config.example.yaml` in all three servers documents `server.json.pretty`

## Version 0.0.4

Governance and conformance release: documented development rules consolidated, engineering standards fed from the standard library, and one test fix on modern JDKs.

- **Autonomous SDLC**: `docs/WORKFLOW.md` documents the six-stage routine - window scope, clean-build gate, three-phase refactoring, production-ready gate, review, and synchronized version bump - with routine gates auto-resolving and commits staying user-reserved
- **Parity rules**: change requests cover all applicable implementations by default, features are not complete until present in all supported implementations, and version numbers stay synchronized across components and the contract; future-version segments are supported for explicit planning
- **Standards set**: `docs/standard/` files renamed to library-paired names (`typescript-fastify`, `java-spring`, `csharp-aspnet`, `go-cli`), enriched from the engineering-standard library, and extended with `docker-general`, `openapi-general`, and `bash-inline` standards
- **Documentation conformance**: `docs/STYLE.md` extracted as the style owner; `AGENTS.md`, `docs/README.md`, and `excel-api-test/README.md` added; execution policy and community posture recorded; missing implementation plans backfilled; `docs/refactoring/0.0.3/JAVA_ASSESSMENT.md` completed
- **Testing**: Java `LifecycleManagerTest` no longer relies on subclass-mocking `ApplicationReadyEvent` and passes on JDK 21+ toolchains
- **Security**: non-breaking `npm audit` remediations applied to `excel-api-node`; `access.yaml` files carry `0600`; residual breaking-upgrade findings are tracked for the next window
- **Hygiene**: stray `locks/` and `.DS_Store` artifacts removed; `locks/` is gitignored

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
