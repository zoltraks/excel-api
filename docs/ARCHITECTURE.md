# Architecture

## Component Diagram

```text
+---------------------------------------------------------------------------+
|                                   Excel API                               |
|                                                                           |
|  +-------------+  +-------------+  +-------------+  +-----------------+   |
|  |  API Server |  |  API Server |  |  API Server |  |    CLI Client   |   |
|  |   (Node)    |  |   (Java)    |  |    (C#)     |  |      (Go)       |   |
|  |  ExcelJS    |  |  Apache POI |  |  ClosedXML  |  |                 |   |
|  +------+------+  +------+------+  +------+------+  +----------+------+   |
|         |                |                |                    |          |
|         +────────────────+────────────────+                    |          |
|                          |                                HTTP / JSON     |
|                   OpenAPI 3.1 Contract ◄────────────────────────+         |
|                          |                                                |
|              +-----------+-----------+                                    |
|              |   Queue + Lock Layer  |                                    |
|              +-----------+-----------+                                    |
|                          |                                                |
|              +-----------+-----------+                                    |
|              |   Local Filesystem    |                                    |
|              |    *.xlsx + *.lock    |                                    |
|              +-----------------------+                                    |
+---------------------------------------------------------------------------+
```

## General Assumptions

**Runtime platform.** Each server implementation runs on its native runtime: Node.js 22 for TypeScript, Java 21 for Spring Boot, .NET 8 for C#. The CLI client runs on Go 1.22+. All runtimes provide native async I/O capabilities.

**Containerization.** All components are packaged as Docker containers. Images are stored in a container registry. Deployment is via Docker or Docker Compose. Container images are self-contained with all runtime dependencies.

**Configuration format.** YAML is the primary configuration format with JSON as an alternative. YAML is preferred for readability and support for comments. Configuration is split into two files: `config.yaml` for non-sensitive settings and `access.yaml` for sensitive data.

**Configuration split.** The separation of `config.yaml` and `access.yaml` enables different access controls and deployment strategies. `config.yaml` can be committed to version control, while `access.yaml` must have restrictive file permissions.

**File-based model.** Excel files reside on the local filesystem or network-mounted filesystems. The service does not provide cloud storage backends. Files are registered in configuration rather than discovered.

**No real-time collaboration.** The file-based model precludes real-time collaborative editing. Concurrent access is managed through advisory file locking and write queuing, not real-time synchronization.

**OpenAPI as single source of truth.** The OpenAPI 3.1 specification in `docs/contract/openapi.yaml` is the authoritative contract. Implementations must conform to it. The contract is never derived from an implementation.

**Cross-implementation interoperability.** All three server implementations share the same lockfile protocol and cache strategy. A lock taken by one implementation is visible to others. This enables running multiple implementations simultaneously without conflict.

## Request Processing Flow

Every HTTP request follows the same processing pipeline in all three implementations.

```text
HTTP Request
    │
    ▼
Authentication ──► 401/403 on failure
    │
    ▼
Route Matching ──► 404 on unknown path
    │
    ▼
Request Validation ──► 400 on invalid input
    │
    ▼
 ┌─────────────────────────────────────┐
 │  READ path           WRITE path     │
 │  ▼                   ▼              │
 │  Cache Lookup        Enqueue        │
 │  ▼                   ▼              │
 │  Return Data         Debounce       │
 │                      ▼              │
 │                      Batch          │
 │                      ▼              │
 │                      Lock File      │
 │                      ▼              │
 │                      Open Excel     │
 │                      ▼              │
 │                      Apply Ops      │
 │                      ▼              │
 │                      Save Excel     │
 │                      ▼              │
 │                      Refresh Cache  │
 │                      ▼              │
 │                      Unlock File    │
 │                      ▼              │
 │                      Return Result  │
 └─────────────────────────────────────┘
```

Read requests never touch the filesystem after initial cache population. Write requests are serialized per workbook through a dedicated queue.

## Authorization Flow

```text
Client                              Server
  │                                    │
  │  POST /auth/token                  │
  │  grant_type=client_credentials     │
  │  client_id=...                     │
  │  client_secret=...                 │
  ├───────────────────────────────────►│
  │                                    │  Validate credentials against access.yaml
  │                                    │  Generate JWT with scopes
  │  200 OK                            │
  │  {"access_token":"eyJ..."}         │
  │◄───────────────────────────────────┤
  │                                    │
  │  GET /workbooks                    │
  │  Authorization: Bearer eyJ...      │
  ├───────────────────────────────────►│
  │                                    │  Verify JWT signature and expiration
  │                                    │  Check scope against endpoint requirement
  │  200 OK                            │
  │◄───────────────────────────────────┤
```

For static token authorization, the client skips the token endpoint and sends `Authorization: Token {value}` directly. The server looks up the token in `access.yaml` and applies the configured scopes.

The authorization check order: if the `Authorization` header value starts with `Bearer `, validate as JWT. If it starts with `Token `, look up in the static token list. If neither prefix matches or the header is absent, return 401.

## Queue and Batching Architecture

Each workbook has a dedicated write queue. The queue accumulates incoming write operations and flushes them as a batch when either condition is met:

- The debounce timer expires (configurable, default 200 ms since last enqueue)
- The batch reaches maximum size (configurable, default 50 operations)

**Batch execution sequence:**

- Acquire exclusive lock on `{fileId}.lock`
- Open the Excel file
- Apply all operations in the order they were enqueued
- Save the Excel file
- Close the file handle
- Refresh the in-memory cache from the saved file
- Release the lock

Write requests are synchronous from the client's perspective. The HTTP response is returned only after the operation has been committed to the file. Each implementation uses a completion signal mechanism: `TaskCompletionSource` in C#, `CompletableFuture` in Java, `Promise` with deferred resolve in Node.

**Backpressure.** The queue has a bounded capacity (configurable, default 1000). When the queue is full, new write requests receive 503 `SERVICE_BUSY`.

## Lockfile Protocol

All implementations follow the same lockfile protocol to enable cross-implementation interoperability.

**Lockfile location.** `{lock_dir}/{fileId}.lock` where `lock_dir` is configured in `config.yaml`.

**Lockfile content.** JSON object written after acquiring the lock:

```json
{
  "pid": 12345,
  "hostname": "worker-01",
  "implementation": "excel-api-node",
  "locked_at": "2025-03-15T14:24:58Z"
}
```

**Lock mechanism.** Advisory file lock using the OS-level `flock(2)` syscall (Linux) or equivalent. Node uses `fs.open` with `flock`, Java uses `FileChannel.lock()`, C# uses `FileStream` with `FileShare.None`. All three use the same kernel facility and are mutually visible.

**Lock timeout.** Configurable (default 30 seconds). If the lock cannot be acquired within the timeout, the batch fails and all enqueued operations receive 409 `FILE_LOCKED` with `Retry-After` header.

**Stale lock detection.** On startup and periodically, the server checks lockfiles against running processes. If the PID in a lockfile does not correspond to a running process on the same hostname, the lockfile is considered stale and removed.

## Cache Architecture

Each registered workbook has an in-memory cache entry containing parsed sheet data, column metadata, and the file's last modification time (`mtime`).

**Cache population.** On first read request for a workbook, the file is parsed and cached. Subsequent reads are served from cache.

**Cache refresh after write.** After every successful batch write, the cache for the affected workbook is refreshed from the saved file.

**External change detection.** A background timer polls the `mtime` of each cached file at a configurable interval (default 2 seconds). If the `mtime` has changed (indicating an external modification), the cache is invalidated and repopulated on the next read.

**Cache bypass.** The `Cache-Control: no-cache` request header forces a cache miss, causing the file to be re-read from disk.

## Configuration Architecture

**`config.yaml`** is the primary configuration file. It is loaded at startup and validated against the expected structure. Missing required fields or invalid values terminate the process with exit code 1 and a descriptive error message.

Configuration hierarchy (lowest to highest priority):

- Config file (`config.yaml`)
- Environment variables (prefixed `EXCEL_API_`)
- Command-line arguments (implementation-specific)

**`access.yaml`** is the sensitive configuration file. It contains credentials, secrets, and access control rules. It is loaded separately with restricted file permission checks (warning if not `0600`). Its values are never logged, even at verbose/trace level.

The path to each file is provided via environment variables `CONFIG_PATH` and `ACCESS_PATH`, with defaults of `/etc/excel-api/config.yaml` and `/etc/excel-api/access.yaml`.

## Dynamic OpenAPI Endpoint

Each implementation serves `GET /openapi.yaml` without authentication. The response is the contract from `docs/contract/openapi.yaml` with three fields dynamically replaced from `config.yaml`:

- `info.title` — from `openapi.title`
- `info.description` — from `openapi.description`
- `servers` — from `openapi.servers` list

The `info.version` field is never modified — it always reflects the contract version, not the instance version. The instance version is available at `GET /health`.

The contract file is loaded once at startup, modifications are applied in memory, and the result is cached as a string. Content-Type: `application/yaml`.

## Record Index Reconciliation

Batch operations that mix inserts and deletes must handle index shifting. The contract specifies that all `row_index` values in a batch request refer to the state of the sheet before the batch begins.

The implementation must internally track index shifts as operations are applied within the batch. Inserts increment indices of subsequent rows. Deletes decrement them. The reconciliation is transparent to the client — the client always uses pre-batch indices.

If a delete refers to a row that was already deleted by a prior operation in the same batch, the entire batch fails atomically.

## Architectural Decisions

| ID   | Decision                  | Choice                                        | Rationale                                                                                |
| ---- | ------------------------- | --------------------------------------------- | ---------------------------------------------------------------------------------------- |
| A-01 | Multi-language implementations | Node, Java, C# servers with Go CLI         | Technology diversity, interchangeability proof, different performance trade-offs        |
| A-02 | OpenAPI 3.1 as contract   | Single source of truth for all implementations | Ensures API consistency, enables client generation, documentation-first development       |
| A-03 | ExcelJS for Node          | ExcelJS 4.x                                   | Lightweight, TypeScript-native, good performance for small to medium files                |
| A-04 | Apache POI for Java       | Apache POI 5.x                                | Most complete OOXML support, streaming reader for large files, optional formula evaluation |
| A-05 | ClosedXML for C#          | ClosedXML 0.102+                              | Fluent API, ergonomic row insertion, ReadyToRun for near-native startup                  |
| A-06 | Advisory file locking     | OS-level flock with lockfile JSON              | Cross-implementation interoperability, stale lock detection, no external dependencies     |
| A-07 | Write queue with debounce  | Per-workbook queue with timer and size trigger | Minimizes file lock duration, batches operations, reduces disk I/O                       |
| A-08 | In-memory cache           | Per-workbook cache with mtime invalidation     | Eliminates disk I/O for reads, detects external changes, configurable polling            |
| A-09 | Dual addressing modes     | Cell-level and record-level endpoints         | Supports both raw spreadsheet access and tabular CRUD operations                         |
| A-10 | Configuration split       | config.yaml + access.yaml                     | Separation of structural and sensitive data, different permission requirements            |
| A-11 | OAuth2 + static tokens    | Multiple authorization mechanisms              | Flexibility for machine-to-machine and human authorization, development convenience      |
| A-12 | CLI-first design          | Go CLI with REPL and batch mode               | Primary interactive surface, supports scripting, independent of server implementation   |
| A-13 | JSON object responses     | Never top-level arrays, always envelope object | Security (JSON hijacking prevention), consistency, extensibility                          |
| A-14 | Contract-first development | OpenAPI defined before implementations         | Clear API surface, prevents implementation divergence, enables client generation         |
| A-15 | Implementation independence | Each component has own build system          | No cross-dependencies, independent deployment, technology choice freedom                  |

## Error Response Envelope

All error responses follow the format defined in PROJECT.md. The `error` field is a machine-readable code. The `message` field is a human-readable description. The `details` field is an optional object with additional context (e.g., which field failed validation, which operation in a batch failed).

Implementations must not include stack traces, internal class names, or filesystem paths in error responses.

## File Structure

The project repository contains five component directories, each with its own source layout and build system.

**excel-api-node/** - TypeScript/Node.js implementation

```
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
```

**excel-api-java/** - Java/Spring Boot implementation

```
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
```

**excel-api-csharp/** - C#/ASP.NET implementation

```
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
```

**excel-api-go/** - Go CLI client

```
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
```

**excel-api-test/** - TypeScript integration test suite

```
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
  config/
    config.yaml                # Test configuration
    access.yaml                # Test credentials
  helpers.ts                   # Test helpers (token acquisition, API client)
  setup.ts                     # Jest setup
  jest.config.ts
  package.json
  Dockerfile
```
