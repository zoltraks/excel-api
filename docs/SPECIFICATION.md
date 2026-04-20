# Implementation Specification

This document describes implementation-specific details, technology choices, known limitations, and deviations from the API contract for each component.

## Excel API Node

**Stack**: Node.js 22 LTS, TypeScript 5.x (strict mode), Fastify, ExcelJS.

**Development standard**: `docs/standard/ts-node-development.md`.

**Source layout:**

```text
excel-api-node/
  src/
    server.ts             # Entry point
    config/               # Config and access.yaml loading, validation
    auth/                 # OAuth2 token endpoint, JWT, static token middleware
    routes/               # Fastify route handlers
    services/             # Business logic (workbook registry, sheet metadata)
    queue/                # Write queue with Promise-chain serialization
    excel/                # ExcelJS wrapper (read, write, style copy, cache)
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
- Display formatting (`format=display`) is limited. ExcelJS provides the `numFmt` string but does not apply it. The implementation applies a subset of common formats (numbers, percentages, dates) and falls back to the raw value for unrecognized format strings.
- Large file performance. ExcelJS parses the entire file into memory. Files exceeding 100,000 rows may cause high memory usage.

**Queue implementation**: Promise-chain serialization. A single `writeChain: Promise<void>` per workbook. Each write operation appends to the chain: `writeChain = writeChain.then(() => executeBatch(...))`. The event loop guarantees sequential execution without mutexes.

**Completion signal**: Each enqueued operation carries a `resolve` and `reject` function from a deferred `Promise`. The HTTP handler `await`s this promise and returns the result to the client.

**OpenAPI loading**: `fs.readFileSync(path.join(__dirname, '../resources/openapi.yaml'))` at startup. Parsed with `yaml` package, fields replaced, serialized back to string and cached.

## Excel API Java

**Stack**: Java 21, Spring Boot 3.x, Apache POI 5.x, Maven.

**Development standard**: `docs/standard/java-spring-maven-development.md`.

**Package**: `pl.alyx.api.excel`.

**Source layout:**

```text
excel-api-java/
  src/main/
    java/pl/alyx/api/excel/
      Application.java          # Spring Boot entry point
      config/                   # Configuration classes, YAML binding
      auth/                     # OAuth2, JWT filter, static token filter
      controller/               # REST controllers
      service/                  # Business logic
      queue/                    # Write queue with BlockingQueue + ExecutorService
      excel/                    # Apache POI wrapper
    resources/
      openapi.yaml              # Contract copy, on classpath
      application.yaml          # Spring Boot config (port, profiles)
  config/
    config.example.yaml         # Example configuration
    access.example.yaml         # Example sensitive configuration
  pom.xml
  Dockerfile
  README.md
```

**Excel library**: Apache POI 5.x (XSSF for `.xlsx`). Most complete OOXML implementation available. Supports styles, formulas (with evaluation), charts, pivot tables, images, comments, conditional formatting, data validation, named ranges.

**Optional formula evaluation**: The Java implementation may optionally evaluate formulas using `FormulaEvaluator.evaluateFormulaCell()`. This is controlled by a configuration flag (`excel.evaluate_formulas: true/false`, default `false`). When enabled, formulas are evaluated before returning values, which provides up-to-date results at the cost of additional processing time. This is a capability that exceeds the contract requirement (which only mandates cached values) and is documented as an implementation-specific feature.

**Large file support**: POI's SAX-based reader (`XSSFReader` + SAX event API) can parse files with millions of rows without loading the entire DOM into memory. The streaming reader is activated automatically when the file size exceeds a configurable threshold (default: 10 MB).

**Known limitations:**

- Memory footprint. The full `XSSFWorkbook` model for a 50 MB file can consume 1–2 GB of heap. The streaming reader mitigates this for read operations, but write operations require the full model.
- Startup time. Spring Boot + JVM cold start is 2–5 seconds, the slowest of the three implementations.

**Queue implementation**: `BlockingQueue<WriteOperation>` per workbook, consumed by a single-thread `ExecutorService`. `CompletableFuture<OperationResult>` is the completion signal — the controller `await`s it via `.get()`.

**OpenAPI loading**: `getClass().getResourceAsStream("/openapi.yaml")` from classpath. Parsed with SnakeYAML, fields replaced, serialized and cached.

## Excel API C#

**Stack**: .NET 8, ASP.NET Minimal API, ClosedXML 0.102+, ReadyToRun (R2R) compilation.

**Development standard**: `docs/standard/csharp-aspnet-development.md`.

**Namespace**: `BigBytes.ExcelApi`.

**Source layout:**

```text
excel-api-csharp/
  src/ExcelApi/
    Program.cs                 # Entry point, Minimal API setup
    Config/                    # Configuration loading, YAML deserialization
    Auth/                      # OAuth2, JWT, static token middleware
    Controllers/               # Endpoint groups (MapGet, MapPost, etc.)
    Services/                  # Business logic
    Queue/                     # Channel<T>-based write queue
    Excel/                     # ClosedXML wrapper
    Resources/
      openapi.yaml             # Contract copy, embedded resource
    ExcelApi.csproj            # Project file with R2R config
  config/
    config.example.yaml        # Example configuration
    access.example.yaml        # Example sensitive configuration
  ExcelApi.sln
  Dockerfile
  README.md
```

**Excel library**: ClosedXML 0.102+. Fluent API for `.xlsx` read-modify-write. `InsertRowsBelow` with style copy is the most ergonomic row insertion among the three libraries. Limited formula evaluation (basic functions only).

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

**Queue implementation**: `Channel<WriteOperation>` with `CreateBounded(capacity)`. A `BackgroundService` per workbook reads from the channel, collects a batch, and executes it. `TaskCompletionSource<OperationResult>` is the completion signal — the Minimal API handler `await`s it.

**OpenAPI loading**: Embedded resource loaded via `Assembly.GetManifestResourceStream("BigBytes.ExcelApi.Resources.openapi.yaml")`. Parsed with YamlDotNet, fields replaced, serialized and cached.

## Excel API Go (CLI Client)

**Stack**: Go 1.22+, no framework for HTTP (standard `net/http` client), `chzyer/readline` for REPL.

**Development standard**: `docs/standard/go-cli-development.md`.

**Source layout:**

```text
excel-api-go/
  cmd/excel-api-go/
    main.go                    # Entry point, flag parsing
  internal/
    client/                    # HTTP API client
      client.go                # Connection, auth, base HTTP methods
      auth.go                  # OAuth2 token acquisition and refresh
      workbooks.go             # Workbook endpoints
      sheets.go                # Sheet endpoints
      records.go               # Record CRUD
      cells.go                 # Cell and range operations
      operations.go            # Batch operations
    cli/
      repl.go                  # Interactive REPL loop
      commands.go              # Command parsing and dispatch
      completer.go             # Tab completion for sheets, columns
      context.go               # Session state (current workbook, sheet)
    format/
      markdown.go              # Markdown table formatter
      csv.go                   # CSV formatter with configurable separator
      json.go                  # JSON pretty-printer
      table.go                 # Plain text table formatter
    config/
      config.go                # CLI configuration and profiles
      version.go               # Version constant
  go.mod
  go.sum
  Dockerfile
  README.md
```

**Two operating modes.**

Interactive mode: REPL with prompt, command history, tab completion for workbook IDs, sheet names, and column identifiers. Session context tracks the current server connection, workbook, and sheet, allowing short commands without repeating context.

Batch mode: commands from stdin or a file, output to stdout. Intended for scripting and piping. Exit code 0 on success, 1 on error. Output format controlled by `--format` flag (json, csv, markdown, table).

**UTF-8 and newline handling.** The formatter layer handles values containing newlines, tabs, and Unicode characters.

- Markdown: newlines replaced with `<br>` (configurable via `--newline-display` flag).
- CSV: values containing the separator, qualifier, or newlines are enclosed in the text qualifier. Default separator: `,`. Default qualifier: `"`. Both configurable via `--separator` and `--quote` flags. Compliant with RFC 4180.
- JSON: standard JSON escaping. No special handling needed.
- Table: newlines replaced with `↵` for alignment preservation.

**Authentication persistence.** OAuth2 tokens are cached in memory for the session duration. Token refresh is automatic — the client re-authenticates when a request receives 401 `TOKEN_EXPIRED`.
