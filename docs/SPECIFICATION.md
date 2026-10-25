# Implementation Specification

This document describes implementation-specific details, technology choices, known limitations, and deviations from the API contract for each component.

## Excel API Node

**Stack**: Node.js 22 LTS, TypeScript 5.x (strict mode), Fastify 5, ExcelJS.

**Development standard**: `docs/standard/typescript-fastify-development.md`.

**Source layout:**

```text
excel-api-node/
  src/
    server.ts             # Bootstrap only: Fastify creation, plugin and route registration, listen
    cli/
      args.ts             # CLI argument parsing
    config/               # Config and access.yaml loading, validation
    auth/                 # JWT, static token middleware
    routes/               # Fastify route plugins (one file per resource group), shared zod request validation
    workbook/             # Workbook registry (file ID resolution, per-sheet config)
    excel/                # ExcelJS wrapper (layout resolution, operations, batch, style copy)
    lock/                 # Filesystem write lockfile (atomic create, stale takeover)
    queue/                # Write queue: per-workbook serialization, debounced batching, capacity cap
    cache/                # mtime-based workbook cache
    metrics/              # Prometheus exposition collector
    ratelimit/            # Fixed-window rate limiter
    logger/               # Console logger, RotatingFileLogger
    util/
      duration.ts         # Canonical duration string parser
  resources/
    openapi.yaml          # Contract copy, loaded at startup
  config/
    config.example.yaml   # Example configuration
    access.example.yaml   # Example sensitive configuration
  package.json
  tsconfig.json
  Dockerfile
  README.md
```

**Excel library**: ExcelJS 4.x. Supports `.xlsx` read-modify-write, styles (font, fill, border, number format, alignment), images, comments, streaming reader for large files.

**Known limitations:**

- No formula evaluation. Formulas are preserved on write, but the API returns cached values only. If a cached value is unavailable (file was modified outside Excel without recalculation), the value is `null` with a `FORMULA_NOT_EVALUATED` warning.
- Display formatting (`format=display`) is limited. ExcelJS provides the `numFmt` string but does not apply it. The implementation applies a subset of common formats (numbers, percentages, dates) and falls back to the native value for unrecognized format strings. For consistent string representation, use `format=string` instead.
- Large file performance. ExcelJS parses the entire file into memory. Files exceeding 100,000 rows may cause high memory usage.
- Foreign-written packages. ExcelJS matches unprefixed element names; files saved by writers that emit the spreadsheetml namespace with an `x:` prefix (for example ClosedXML) parse to an empty model. On a parse failure the implementation rewrites the package in memory (drops `docProps/*`, strips the `x:` element prefix from every XML part) and retries the load.

**Queue implementation**: Per-workbook serialization via a `Promise` chain with debounced batching. Operations enqueue into a pending list per workbook; after `batch_debounce_ms` (or immediately when the batch is full), pending operations execute as one batch inside a single file lock and a single open/save cycle. Pending depth is capped at `batch_max_size` — excess submissions are rejected with `503 SERVICE_BUSY`.

**Completion signal**: Each enqueued operation carries a `resolve` and `reject` function from a deferred `Promise`. The HTTP handler `await`s this promise and returns the per-operation result to the client.

**OpenAPI loading**: `fs.readFileSync(path.join(__dirname, '../resources/openapi.yaml'))` at startup. Parsed with `yaml` package, fields replaced, serialized back to string and cached.

**Command-line parameters**: The Node implementation accepts `--work`, `--config`, and `--access` parameters. These correspond to environment variables `WORK`, `CONFIG`, and `ACCESS`. The working directory parameter sets the base path for configuration file resolution. Config and access parameters can specify alternate file locations (relative to working directory if set, or absolute paths).

## Excel API Java

**Stack**: Java 21, Spring Boot 3.x, Apache POI 5.x, Maven.

**Development standard**: `docs/standard/java-spring-development.md`.

**Package**: `pl.alyx.api.excel`.

**Source layout:**

```text
excel-api-java/
  src/main/
    java/pl/alyx/api/excel/
      Application.java          # Spring Boot entry point
      configuration/            # All *Configuration classes: settings models, file loaders, and @Configuration wiring
      controller/               # REST controllers
      dto/                      # Request and response models
      exception/                # Domain exception classes (*Exception)
      filter/                   # JWT, static-token, ACL, and rate-limit servlet filters
      handler/                  # GlobalExceptionHandler (@RestControllerAdvice)
      lifecycle/                # LifecycleManager (--life graceful shutdown)
      observability/            # MetricsCollector and MetricsFilter (Prometheus)
      service/                  # Business logic: ExcelFileService (Apache POI), FileLockService, WriteQueueService
      utility/                  # Shared helpers: RequestGuards, CellConverter, SheetLayout, DurationParser, ConfigurationEnvironmentSupport, ConfigurationPathResolver, JsonLogLayout (logback-referenced), JwtUtil
    resources/
      openapi.yaml              # Contract copy, on classpath
      application.yaml          # Spring Boot config (port, profiles)
      logback-spring.xml        # Logback configuration
  config/
    config.example.yaml         # Example configuration
    access.example.yaml         # Example sensitive configuration
    application.example.properties # Example Spring Boot overrides
  pom.xml
  Dockerfile
  README.md
```

**Excel library**: Apache POI 5.x (XSSF for `.xlsx`). Most complete OOXML implementation available. Supports styles, formulas (with evaluation), charts, pivot tables, images, comments, conditional formatting, data validation, named ranges.

**Optional formula evaluation**: The Java implementation may optionally evaluate formulas using `FormulaEvaluator.evaluateFormulaCell()`. This is controlled by a configuration flag (`excel.evaluate_formulas: true/false`, default `false`). When enabled, formulas are evaluated before returning values, which provides up-to-date results at the cost of additional processing time. This is a capability that exceeds the contract requirement (which only mandates cached values) and is documented as an implementation-specific feature.

**Large file support**: POI's SAX-based reader (`XSSFReader` + SAX event API) can parse files with millions of rows without loading the entire DOM into memory. The streaming reader is activated automatically when the file size exceeds a configurable threshold (default: 10 MB).

**Known limitations:**

- Memory footprint. The full `XSSFWorkbook` model for a 50 MB file can consume 1–2 GB of heap. The streaming reader mitigates this for read operations, but write operations require the full model.
- Startup time. Spring Boot + JVM cold start is 2–5 seconds, the slowest of the four implementations.

**Queue implementation**: Per-workbook `synchronized` monitor serialization. `WriteQueueService.submit()` executes each job under the workbook's monitor object, so writes to the same workbook never interleave. Pending depth is tracked per workbook with an `AtomicInteger` and capped at `batch_max_size` — excess submissions throw `ServiceBusyException` (`503 SERVICE_BUSY`). The synchronous monitor is the completion signal: the controller blocks inside `submit()` until the job returns.

**OpenAPI loading**: `getClass().getResourceAsStream("/openapi.yaml")` from classpath. Parsed with SnakeYAML, fields replaced, serialized and cached.

**Command-line parameters**: The Java implementation accepts `--work`, `--config`, and `--access` parameters. These correspond to environment variables `WORK`, `CONFIG`, and `ACCESS`. The working directory parameter sets the base path for configuration file resolution. Config and access parameters can specify alternate file locations (relative to working directory if set, or absolute paths).

## Excel API C#

**Stack**: .NET 8, ASP.NET Minimal API, ClosedXML 0.102+, ReadyToRun (R2R) compilation.

**Development standard**: `docs/standard/csharp-aspnet-development.md`.

**Namespace**: `BigBytes.ExcelApi`.

**Source layout:**

```text
excel-api-csharp/
  src/ExcelApi/
    Program.cs                 # Bootstrap only: DI registration, middleware, endpoint groups, run
    Options/                   # Bound settings (*Options), OptionsLoader, OptionsPathResolver, DurationParser
    Security/                  # JwtService, AuthService, auth middleware
    Contracts/                 # Request and response model classes
    Endpoints/                 # Extension methods registering endpoint groups per resource, shared ErrorMapping
    Metrics/                   # MetricsCollector
    Logging/                   # JSON console formatter, RotatingFileLogger
    Services/                  # Business logic: ExcelService, FileLockService, WriteQueueService, SheetLayout
    Resources/
      openapi.yaml             # Contract copy, embedded resource
    ExcelApi.csproj            # Project file with R2R config
  tests/ExcelApi.Tests/        # MSTest project mirroring the src folder structure
  config/
    config.example.yaml        # Example configuration
    access.example.yaml        # Example sensitive configuration
    appsettings.example.json   # Example ASP.NET settings (kept out of publishable content globs)
  ExcelApi.sln
  Dockerfile
  README.md
```

**Excel library**: ClosedXML 0.102+. Fluent API for `.xlsx` read-modify-write. `InsertRowsBelow` with style copy is the most ergonomic row insertion among the four libraries. Limited formula evaluation (basic functions only).

**AOT considerations**: Full Native AOT is not used due to ClosedXML's runtime reflection in the formula evaluator and `System.Xml.Linq` usage. ReadyToRun (R2R) is used instead, providing pre-compiled native code with IL fallback for reflection paths. Startup time: 200–400 ms. Migration to full AOT is planned when ClosedXML declares official trimming support.

**R2R configuration** in `ExcelApi.csproj`:

```xml
<PropertyGroup>
    <ReadyToRun>true</ReadyToRun>
    <PublishReadyToRun>true</PublishReadyToRun>
    <SelfContained>true</SelfContained>
</PropertyGroup>
```

**Known limitations:**

- No streaming reader. ClosedXML loads the entire file into memory. For files exceeding 100,000 rows, the Java implementation should be preferred.
- Formula evaluation covers a subset of Excel functions. Complex or nested formulas may return incorrect values or fall back to cached values.

**Queue implementation**: Per-workbook `SemaphoreSlim` lane serialization. `WriteQueueService.SubmitAsync()` awaits the lane's gate so writes to the same workbook never interleave. Pending depth is tracked per lane via `Interlocked` and capped at `batch_max_size` — excess submissions throw `ServiceBusyException` (`503 SERVICE_BUSY`). The awaited task inside `SubmitAsync` is the completion signal.

**OpenAPI loading**: Embedded resource loaded via `Assembly.GetManifestResourceStream("BigBytes.ExcelApi.Resources.openapi.yaml")`. Parsed with YamlDotNet, fields replaced, serialized and cached.

**Command-line parameters**: The C# implementation accepts `--work`, `--config`, and `--access` parameters. These correspond to environment variables `WORK`, `CONFIG`, and `ACCESS`. The working directory parameter sets the base path for configuration file resolution. Config and access parameters can specify alternate file locations (relative to working directory if set, or absolute paths).

## Excel API Rust

**Stack**: Rust 1.89+ (edition 2024) on Tokio, axum 0.8 for HTTP, `umya-spreadsheet` for `.xlsx` read-modify-write, `jsonwebtoken` for HS256, `bcrypt` for password hashes, `axum-server` for TLS, `tower-http` for CORS. Single crate at `excel-api-rust/` (no workspace).

**Excel library**: umya-spreadsheet. Preserves formulas and styles across read-modify-write, which neither `calamine` (read-only) nor `rust_xlsxwriter` (rewrites files) guarantee. `insert_new_row` rewrites formula references — the implementation snapshots formula text before insertion and restores it afterward to keep displaced rows byte-identical, matching ExcelJS behavior. `formatted_value` supplies the `display` cell format.

**Async boundaries**: All blocking workbook and file work (load, save, lock acquisition) runs inside `tokio::task::spawn_blocking`; request handlers never block Tokio worker threads. State is injected via `axum::extract::State` over `Arc<AppState>` — no globals. All errors map through a shared `IntoResponse`-producing helper.

**Queue implementation**: One Tokio lane task per workbook, fed by an `mpsc` channel. Pending ops are debounced (`batch_debounce_ms`, timer restarts on each enqueue) and flushed as one batch under a single lock/open/save cycle. Depth is capped at `batch_max_size` — overflow returns `503 SERVICE_BUSY`. Completion travels over `oneshot` channels; lock-acquisition failure maps to `409 FILE_LOCKED`.

**Caching**: The parsed `Workbook` is cached per path and stat-checked on every get; a poll task sweeps stale entries on `cache.poll_interval_ms`. `Cache-Control: no-cache` bypasses both get and set. Writes invalidate the path after a successful save.

**OpenAPI loading**: The contract is embedded at compile time (`include_str!` on `resources/openapi.yaml`, kept in sync by `shell/sync.sh`). At startup `info.title`, `info.description`, and `servers` are replaced from `config.openapi`; `info.version` stays untouched and must equal `Cargo.toml`'s `package.version`.

**Command-line parameters**: `--work`, `--config`, `--access`, `--life`, matching `WORK`, `CONFIG`, `ACCESS`, `LIFE` environment variables and the sibling implementations' resolution order (explicit file > `--work/config/` > `./config/`).

**Known limitations:**

- `display` formatting uses umya-spreadsheet's own `formatted_value`; rendering may differ slightly from ExcelJS `cell.text` for exotic number formats.
- No streaming reader — the whole workbook is parsed per cache miss. For very large files, the Java implementation remains preferable.
- Date cells are detected from number-format codes (builtin ids 14-22, 45-47, or codes containing `y`/`d`); uncommon custom formats may surface as plain numbers.
- Foreign-written packages. umya-spreadsheet does not match `x:`-prefixed spreadsheetml elements, so a foreign-saved workbook loads to an empty model. `excel::load` detects the empty-sheet signature and retries with an in-memory normalized package (`docProps/*` dropped, `x:` element prefixes stripped).

## Cross-Implementation Behaviors

**/auth/token content type.** The contract declares `application/x-www-form-urlencoded`. All four servers accept both `application/x-www-form-urlencoded` and `application/json` bodies - a deliberate lenient superset of the declared contract so every client shape works.

**/health zone precedence.** Every implementation resolves the reported `zone` identifier through the same chain: `TZ` environment variable, then the `/etc/localtime` symlink target on Unix hosts, then the platform default zone.

## Excel API Go (CLI Client)

**Stack**: Go 1.22+, standard library only (`net/http` client, `bufio` REPL). No external dependencies — `go.mod` declares no required modules.

**Development standard**: `docs/standard/go-cli-development.md`.

**Source layout:**

```text
excel-api-go/
  cmd/excel-api-go/
    main.go                    # Orchestration only: flag parsing, dispatch, exit codes
  internal/
    client/                    # HTTP API client
      client.go                # Connection, auth, endpoints, path/query escaping
      types.go                 # Request/response structs
    cli/
      repl.go                  # Interactive REPL loop with sub-command dispatch
    format/
      markdown.go              # Output formatters: Markdown, CSV, plain-text table
    config/
      config.go                # CLI configuration, profiles, path resolution
      version.go               # Version constant
  go.mod
  go.sum
  Dockerfile
  README.md
```

**Two operating modes.**

Interactive mode: REPL with prompt, command history, tab completion for workbook IDs, sheet names, and column identifiers. Session context tracks the current server connection, workbook, and sheet, allowing short commands without repeating context.

Batch mode: commands from stdin or a file, output to stdout. Intended for scripting and piping. Exit code 0 on success, 1 on error. The `--format` flag selects the server-side cell-value format (`native`, `display`, `string`, `csv`, `markdown`, `table`) and is passed through to the API as the `format` query parameter.

**UTF-8 and newline handling.** Cell values pass through to stdout unchanged; `internal/format` provides simple Markdown/CSV/table formatters for record lists without configurable separators or quoting.

**Authentication persistence.** OAuth2 tokens are cached in memory for the session duration. Token refresh is automatic — the client re-authenticates when a request receives 401 `TOKEN_EXPIRED`.

**Command-line parameters**: The Go CLI accepts `--work`, `--config`, and `--access` parameters. These correspond to environment variables `WORK`, `CONFIG`, and `ACCESS`. The working directory parameter sets the base path for configuration file resolution. Config and access parameters can specify alternate file locations (relative to working directory if set, or absolute paths).

## Excel API Test (Integration Test Suite)

**Stack**: TypeScript 5.x, Jest, standard `node-fetch` for HTTP requests.

**Development standard**: Follows TypeScript/Node.js standard from `docs/standard/typescript-fastify-development.md`.

**Source layout:**

```text
excel-api-test/
  integration/
    auth.test.ts               # Authorization endpoint tests
    workbooks.test.ts          # Workbook CRUD tests
    sheets.test.ts             # Sheet metadata tests
    rows.test.ts               # Record CRUD tests
    operations.test.ts         # Batch operation tests
    cells.test.ts              # Cell and range tests
    locking.test.ts            # File locking tests
    concurrency.test.ts        # Concurrent access tests
    openapi-endpoint.test.ts   # OpenAPI spec endpoint test
  fixture/
    # Excel test fixtures (simple data, styled rows, formulas, large datasets)
    csv/
      # CSV test fixtures for import scenarios
  config/
    config.yaml                # Test configuration (server URL, test workbook paths)
    access.yaml                # Test credentials (OAuth2, static tokens)
  helpers.ts                   # Test helpers (token acquisition, API client functions)
  setup.ts                     # Jest setup (test environment configuration)
  jest.config.ts               # Jest configuration
  package.json
  Dockerfile
  README.md
```

**Test approach**: Black-box integration tests. Tests execute against a running server implementation via HTTP. Tests know only the API contract, not the implementation details. This ensures all four server implementations can be validated against the same test suite.

**Test categories**:

- Authorization tests validate OAuth2 flows, JWT validation, static token authentication, and scope-based access control
- Workbook tests validate workbook listing, details, and error handling for unknown workbooks
- Sheet tests validate sheet metadata retrieval, column definitions, and header configuration
- Record tests validate record CRUD operations, batch operations, and index reconciliation
- Cell tests validate cell read/write, range reads, and metadata
- Operation tests validate atomic batch execution and error handling
- Locking tests validate advisory file locking, lock timeout, and stale lock detection
- Concurrency tests validate cache behavior under concurrent access
- OpenAPI endpoint test validates the dynamic OpenAPI spec endpoint

**Test fixtures**: Pre-built Excel files covering various scenarios:
- Simple data sheets with single and multiple header rows
- Sheets with styled rows (fonts, fills, borders)
- Sheets with formula cells
- Large datasets for performance testing
- CSV files for import testing

**Test configuration**: The `config.yaml` file specifies the target server URL and paths to test workbooks. The `access.yaml` file contains test credentials for authorization testing.
