# Project Specification

## Document Navigation

| Section                    | Contents                                                                  |
| -------------------------- | ------------------------------------------------------------------------- |
| **System Overview**        | Vision, goals, glossary, quality targets, component diagram               |
| → Project Philosophy       | Design commitments governing all implementation decisions                 |
| **Data Model**             | Dual addressing modes, header configurations, value types, cell metadata  |
| → Cell Addressing          | Raw access by sheet, row, column, cell reference, range                   |
| → Record Addressing        | Tabular access with configurable header rows and legend sheets            |
| **Components Overview**    | All five components with stack, directory, and purpose                    |
| **API Contract**           | Endpoint groups, authorization, configuration files, error format         |
| → Authorization            | OAuth2 flows, JWT, static tokens, scope-based access control              |
| → Configuration            | `config.yaml` and `access.yaml` structure and separation rationale        |
| **Operations**             | File locking, queue batching, cache invalidation, deployment              |

# System Overview

## Vision

Excel API is an HTTP service that exposes Excel spreadsheet files as a JSON API with support for reading, writing, and modifying workbook data.

The project has three interchangeable server implementations sharing a single OpenAPI 3.1 contract, plus a command-line client for interactive and batch operations.

This document is the primary project specification and the definitive source of truth for all project requirements.
It serves as the foundation for initial development and subsequent extension.

The project addresses a recurring need in enterprise environments: programmatic access to data stored in Excel files without requiring Excel or COM automation.
Files remain on the local filesystem and are accessed through a service layer that minimizes file locking time by queuing write operations and executing them in batches.

## Glossary

| Term       | Definition                                                              |
| ---------- | ----------------------------------------------------------------------- |
| Workbook   | Excel file (`.xlsx`) registered in the service configuration            |
| Sheet      | Named worksheet tab within a workbook                                   |
| Cell       | Single data unit at a column-row intersection, addressed as `A1`, `B5`  |
| Range      | Rectangular block of cells, addressed as `A1:D10`                       |
| Row        | Horizontal line of cells identified by 1-based index                    |
| Column     | Vertical line of cells identified by letter (`A`–`ZZ`) or 0-based index |
| Record     | Data row in tabular mode, addressed by 0-based index among data rows    |
| Header     | One or more rows defining column identifiers, types, and descriptions   |
| Legend     | Separate sheet providing column metadata for a headerless data sheet    |
| Batch      | Group of write operations executed in a single file open/save cycle     |
| Lock       | Advisory file lock preventing concurrent writes from multiple processes |
| Lockfile   | Companion `.lock` file used for cross-process advisory locking          |
| Cache      | In-memory copy of workbook data served for read requests                |
| Debounce   | Delay before executing queued operations to accumulate a larger batch   |
| Scope      | Authorization permission level: `read`, `write`, `admin`                |

**Record** is a data row in tabular mode. Unlike a raw row (which is addressed by its Excel row number), a record is addressed by its 0-based index among data rows only, excluding header rows.

**Legend** is a separate worksheet that provides column metadata (identifiers, types, descriptions in multiple languages) for another worksheet that contains only data without any header rows.

## Abbreviations

| Abbreviation | Expansion                             |
| ------------ | ------------------------------------- |
| CLI          | Command Line Interface                |
| API          | Application Programming Interface     |
| REST         | Representational State Transfer       |
| OAuth        | Open Authorization                    |
| JWT          | JSON Web Token                        |
| RBAC         | Role-Based Access Control             |
| CRUD         | Create, Read, Update, Delete          |
| CSV          | Comma-Separated Values                |
| REPL         | Read-Eval-Print Loop                  |
| AOT          | Ahead-of-Time compilation             |
| R2R          | ReadyToRun pre-compilation            |
| POI          | Apache POI (Java Excel library)       |
| TLS          | Transport Layer Security              |

## Name and Identification

| Element        | Value              |
| -------------- | ------------------ |
| Project Name   | Excel API          |
| Repository     | `excel-api`        |
| License        | MIT                |
| CLI Binary     | `excel-api-go`     |
| API Base Path  | `/api/v1`          |
| Default Port   | `8443`             |

## Components Overview

| Component  | Stack                | Directory            | Purpose                                    |
| ---------- | -------------------- | -------------------- | ------------------------------------------ |
| API Server | Node.js 22 + TS      | `excel-api-node/`    | Lightweight implementation using ExcelJS   |
| API Server | Java 21 + Spring     | `excel-api-java/`    | Full-featured implementation using POI     |
| API Server | C# + ASP.NET 8       | `excel-api-csharp/`  | Mid-weight implementation using ClosedXML  |
| CLI Client | Go 1.22+             | `excel-api-go/`      | Interactive and batch console client       |
| Test Suite | TypeScript + Jest    | `excel-api-test/`    | Black-box integration tests                |

## Goals

| Goal               | Description                                                    |
| ------------------ | -------------------------------------------------------------- |
| Interchangeability | All server implementations share one API contract              |
| Minimal locking    | Write operations are batched to minimize file lock duration    |
| Dual addressing    | Both cell-level and record-level data access                   |
| Multi-header       | Configurable header rows, type rows, description rows, legends |
| Format fidelity    | Preserve styles, formatting, and formulas during edits         |
| UTF-8 safety       | Full Unicode support including newlines in cell values         |
| Self-contained     | Each implementation builds and deploys independently           |
| CLI workflow       | Interactive REPL and batch mode for scripted operations        |

## Non-Goals

| Non-Goal                  | Rationale                                              |
| ------------------------- | ------------------------------------------------------ |
| Formula evaluation engine | Rely on cached values; full evaluation is optional     |
| Real-time collaboration   | File-based model precludes concurrent editing          |
| Cloud storage backends    | Files are on local or network-mounted filesystems      |
| `.xls` (BIFF8) support    | Only `.xlsx` (OOXML) is supported                      |
| GUI application           | CLI is the primary interactive surface                 |
| Built-in file manager     | Files are registered in configuration, not discovered  |

## Quality Requirements

All targets apply to a reference environment: 2-core CPU, 1 GB RAM, SSD storage.

| Requirement                       | Target          |
| --------------------------------- | --------------- |
| API response, row list (≤ 500)    | < 200 ms at p99 |
| API response, single row GET      | < 100 ms at p99 |
| Batch write, 50 operations        | < 2 seconds     |
| File lock hold time, 50 ops       | < 1 second      |
| CLI command round-trip (LAN)      | < 500 ms        |
| `excel-api-go` binary size        | < 15 MB         |
| API contract test coverage        | 100 %           |
| Implementation unit test coverage | ≥ 80 %          |

## Project Philosophy

**API-first.** All operations are exposed via a standardized REST API. Every JSON response from any endpoint must be a JSON object, never a top-level array. Collections are always wrapped in an envelope object with an `items` key.

**Contract-first.** The OpenAPI specification in `docs/contract/openapi.yaml` is the single source of truth for the API surface. Implementations conform to the contract. The contract is never derived from an implementation.

**CLI-first.** The command-line client is the primary interactive surface. Every operation available through the API must be reachable via the `excel-api-go` CLI.

**Minimal file locking.** Excel files are opened for writing only long enough to apply a batch of operations and save. Read requests are served from an in-memory cache and never touch the file.

**Implementation independence.** Each server implementation is a standalone project with its own build system, dependencies, Dockerfile, and copy of the OpenAPI specification. No implementation depends on another.

## Target Audience

- **Integration engineers**: Building data pipelines that read from or write to Excel files maintained by business users.
- **System administrators**: Exposing spreadsheet data as a service without deploying Excel or LibreOffice.
- **Developers**: Automating Excel operations via CLI or HTTP API in CI/CD pipelines, migration scripts, or reporting tools.

# Data Model

## Dual Addressing

The API exposes two complementary addressing modes for the same underlying Excel data.

**Cell addressing** provides raw access to the spreadsheet grid. Cells are referenced by Excel-style coordinates (`A1`, `B5`), ranges by start-end pairs (`A1:D10`). No interpretation of headers or data structure is applied. This mode is used for operations that do not fit a tabular model — editing individual cells, reading arbitrary ranges, or working with sheets of irregular structure.

**Record addressing** provides tabular access. A sheet is interpreted as a table with a header region and a data region. Rows in the data region are called records and addressed by 0-based index. Columns are addressed by their header identifier (text from the header row). This mode is used for CRUD operations on structured data.

Both modes coexist on the same sheet. A sheet configured for tabular access can still be accessed via cell endpoints.

## Header Configuration

The structure of header rows is defined per sheet in `config.yaml`. Four configurations are supported.

**Single header row.** The most common layout. One row contains column identifiers. Data starts from the next row.

**Multiple header rows.** Separate rows for identifiers, types, and descriptions. The configuration specifies which row serves which role.

**Legend sheet.** Column metadata is stored in a separate worksheet. The data sheet contains only data rows, starting from row 1. The legend sheet describes each column in successive rows: column letter or index, identifier, type, and optionally descriptions in multiple languages.

**No header (raw mode).** The sheet has no tabular interpretation. Only cell-level endpoints are available. Record-level endpoints return 400.

Default behavior when no configuration is provided for a sheet: single header row at row 1, data from row 2.

## Value Types

Cell values are represented in JSON according to their Excel type.

| Excel Type | JSON Type | Notes                                            |
| ---------- | --------- | ------------------------------------------------ |
| String     | `string`  | UTF-8, may contain newlines and special chars    |
| Number     | `number`  | IEEE 754 double                                  |
| Boolean    | `boolean` | `true` or `false`                                |
| Date       | `string`  | ISO 8601 format (`2025-03-15T14:22:00Z`)         |
| Formula    | varies    | Cached value type; `null` if cache unavailable   |
| Empty      | `null`    | Cell exists but has no value                     |

String values preserve embedded newlines (`\n`, `\r\n`), tabs, and all Unicode characters. The API guarantees lossless round-trip: reading a value and writing it back produces an identical cell.

## Formatted Values

The API supports two output formats controlled by the `format` query parameter.

With `format=raw` (default), values are returned as their native JSON types. With `format=display`, values are formatted according to the cell's `number_format` string (e.g., `1234.56` becomes `"1 234,56 zł"`). Display formatting is best-effort — the implementation applies the format string where possible and falls back to the raw value otherwise.

## Cell Metadata

Each cell in a range or row response may include metadata beyond its value.

| Field           | Type      | Description                                          |
| --------------- | --------- | ---------------------------------------------------- |
| `value`         | any       | Cell value in the requested format                   |
| `type`          | `string`  | Detected type: `string`, `number`, `date`, etc.      |
| `number_format` | `string?` | Excel number format string, `null` if none           |
| `is_formula`    | `boolean` | `true` if cell contains a formula                    |
| `formatted`     | `string?` | Display-formatted value (only with `format=display`) |

# Components

## API Servers

Three implementations of the same OpenAPI contract. Each is a standalone HTTP service that reads, writes, and modifies Excel files on the local filesystem.

**Excel API Node** (`excel-api-node/`). TypeScript on Node.js 22, using ExcelJS for spreadsheet operations and Fastify for HTTP. Lightest footprint, fastest startup. Does not evaluate formulas — returns cached values only. Natural single-threaded queue via Promise chains.

**Excel API Java** (`excel-api-java/`). Java 21 on Spring Boot, using Apache POI for spreadsheet operations. Most complete Excel format coverage. Optional formula evaluation via POI's `FormulaEvaluator`. Streaming reader (SAX API) for large files. Heaviest footprint.

**Excel API C#** (`excel-api-csharp/`). C# on ASP.NET 8 Minimal API, using ClosedXML for spreadsheet operations. Published with ReadyToRun (R2R) for near-native startup. `InsertRowsBelow` with style copy is the most ergonomic row insertion API among the three libraries. `Channel<T>` provides bounded-capacity queue with backpressure.

All three implementations share:

- Common configuration file format (`config.yaml`, `access.yaml`)
- Common lockfile protocol for cross-process synchronization
- Common cache invalidation strategy (mtime polling)
- Dynamic `/openapi.yaml` endpoint serving the contract with instance-specific metadata
- Identical error response format and HTTP status code semantics

## CLI Client

**Excel API Go** (`excel-api-go/`). Command-line client in Go connecting to any API server instance. Supports interactive REPL mode and batch mode (stdin/file input, stdout output).

Interactive mode provides connection management, workbook/sheet navigation, record and cell CRUD, and output formatting (JSON, CSV, Markdown tables). Batch mode enables scripted operations with configurable output format, separator, and text qualifier for CSV.

The CLI handles UTF-8 values including embedded newlines. In Markdown table output, newlines within cell values are replaced with a configurable marker (default: `<br>`). In CSV output, values containing the separator, qualifier, or newlines are enclosed in the text qualifier per RFC 4180.

## Integration Test Suite

**Excel API Test** (`excel-api-test/`). TypeScript test suite using Jest, executing against any server implementation via HTTP. Tests are black-box — they know only the API contract, never the implementation.

Test fixtures are pre-built Excel files covering: simple data, styled rows, formula cells, large datasets. Test configuration provides OAuth2 credentials and static tokens for authorization testing.

# API Contract

The authoritative specification is `docs/contract/openapi.yaml`. This section summarizes the contract for reference.

## Endpoint Groups

**Authorization** (unauthenticated)

| Method | Path          | Description                     |
| ------ | ------------- | ------------------------------- |
| POST   | `/auth/token` | Obtain JWT via OAuth2 flow      |

**Service** (unauthenticated)

| Method | Path            | Description                            |
| ------ | --------------- | -------------------------------------- |
| GET    | `/openapi.yaml` | OpenAPI spec with instance metadata    |
| GET    | `/health`       | Health check with implementation info  |

**Workbooks** (authenticated, scope: `read`)

| Method | Path              | Description               |
| ------ | ----------------- | ------------------------- |
| GET    | `/workbooks`      | List registered workbooks |
| GET    | `/workbooks/{id}` | Workbook details          |

**Sheets** (authenticated, scope: `read`)

| Method | Path                                        | Description         |
| ------ | ------------------------------------------- | ------------------- |
| GET    | `/workbooks/{id}/sheets/{sheet}`            | Sheet metadata      |
| GET    | `/workbooks/{id}/sheets/{sheet}/columns`    | Column definitions  |

**Records** (authenticated, scope: `read` or `write`)

| Method | Path                                             | Description   |
| ------ | ------------------------------------------------ | ------------- |
| GET    | `/workbooks/{id}/sheets/{sheet}/records`         | List records  |
| GET    | `/workbooks/{id}/sheets/{sheet}/records/{index}` | Single record |
| POST   | `/workbooks/{id}/sheets/{sheet}/records`         | Add record    |
| PUT    | `/workbooks/{id}/sheets/{sheet}/records/{index}` | Update record |
| DELETE | `/workbooks/{id}/sheets/{sheet}/records/{index}` | Delete record |

**Cells** (authenticated, scope: `read` or `write`)

| Method | Path                                           | Description |
| ------ | ---------------------------------------------- | ----------- |
| GET    | `/workbooks/{id}/sheets/{sheet}/cells/{ref}`   | Read cell   |
| PUT    | `/workbooks/{id}/sheets/{sheet}/cells/{ref}`   | Write cell  |
| GET    | `/workbooks/{id}/sheets/{sheet}/range/{range}` | Read range  |

**Batch Operations** (authenticated, scope: `write`)

| Method | Path                                              | Description             |
| ------ | ------------------------------------------------- | ----------------------- |
| POST   | `/workbooks/{id}/sheets/{sheet}/operations`       | Batch record operations |
| POST   | `/workbooks/{id}/sheets/{sheet}/cells/operations` | Batch cell operations   |

**Diagnostics** (authenticated, scope: `admin`)

| Method | Path                          | Description          |
| ------ | ----------------------------- | -------------------- |
| GET    | `/workbooks/{id}/lock-status` | Lock diagnostic info |

## Authorization

The API supports three authorization mechanisms.

**OAuth2 with `client_credentials` grant.** Machine-to-machine authorization. The client sends `client_id` and `client_secret` to `POST /auth/token` and receives a JWT.

**OAuth2 with `password` grant.** User authorization. The client sends `username`, `password`, `client_id`, and `client_secret` to `POST /auth/token` and receives a JWT.

**Static token.** Development and monitoring use. The client sends `Authorization: Token {value}` in each request. Tokens and their scopes are defined in `access.yaml`.

The `POST /auth/token` endpoint follows RFC 6749. Request body is `application/x-www-form-urlencoded`. Response is JSON with `access_token`, `token_type`, `expires_in`, and `scope`.

JWT claims include `sub` (subject), `scope` (space-separated scopes), `iss` (issuer from config), `exp` (expiration), and `iat` (issued at).

The authorization check order for each request: if the `Authorization` header starts with `Bearer`, validate as JWT. If it starts with `Token`, look up in the static token list from `access.yaml`.

Three endpoints are accessible without authorization: `POST /auth/token`, `GET /openapi.yaml`, `GET /health`.

## Configuration

Each implementation uses two configuration files.

**`config.yaml`** contains non-sensitive settings: server port and TLS, workbook registry (file ID to path mapping, readonly flag, per-sheet header configuration), queue parameters (batch size, debounce, lock timeout), cache settings (invalidation strategy, poll interval), authorization mode, JWT issuer and expiration, logging level and format, and OpenAPI metadata overrides (title, description, servers list).

**`access.yaml`** contains sensitive data: JWT signing secret, OAuth2 client credentials and user password hashes (bcrypt), static token values with names and scopes, and ACL rules mapping scopes to allowed HTTP methods.

The separation ensures `access.yaml` can have restrictive file permissions (`0600`) while `config.yaml` can be safely committed to version control. Both files are validated at startup. Invalid configuration terminates the process with a descriptive error.

## Error Format

All error responses use a consistent envelope.

```json
{
  "error": "ERROR_CODE",
  "message": "Human-readable description",
  "details": {}
}
```

| Status | Error Code            | Condition                                |
| ------ | --------------------- | ---------------------------------------- |
| 400    | `INVALID_REQUEST`     | Request validation failure               |
| 401    | `UNAUTHORIZED`        | Missing or invalid token                 |
| 401    | `TOKEN_EXPIRED`       | JWT has expired                          |
| 403    | `FORBIDDEN`           | Insufficient scope                       |
| 404    | `WORKBOOK_NOT_FOUND`  | Workbook ID not in registry              |
| 404    | `SHEET_NOT_FOUND`     | Sheet name not in workbook               |
| 404    | `ROW_NOT_FOUND`       | Row or record index out of range         |
| 409    | `FILE_LOCKED`         | Lock acquisition timed out               |
| 422    | `READONLY_WORKBOOK`   | Write attempt on readonly workbook       |
| 503    | `SERVICE_BUSY`        | Operation queue is full                  |

# Operations

## File Locking

Write operations require an exclusive lock on the target workbook. The lock is implemented as an advisory file lock on a companion lockfile (`{fileId}.lock` in the configured lock directory).

The lockfile contains JSON with the locking process PID, hostname, timestamp, and implementation identifier. This enables cross-process and cross-implementation interoperability — a lock taken by the Node implementation is visible to the Java implementation and vice versa.

Lock acquisition has a configurable timeout (default: 30 seconds). If the lock cannot be acquired within the timeout, the API returns 409 `FILE_LOCKED` with a `Retry-After` header.

## Queue Batching

Write operations are not executed immediately. Each workbook has a dedicated write queue. Incoming operations are buffered and executed in batches.

A batch is triggered by either a debounce timer expiring (default: 200 ms of inactivity) or the batch reaching maximum size (default: 50 operations). The batch execution sequence: acquire lock, open file, apply all operations in order, save file, refresh cache, release lock.

Batch operations within a single request (`POST .../operations`) are atomic. If any operation in the batch fails, no changes are committed. The response indicates which operation failed and how many were applied (zero on failure).

## Cache Invalidation

Read requests are served from an in-memory cache of parsed workbook data. The cache is refreshed after every successful write operation. External changes (another process modifying the file) are detected via mtime polling at a configurable interval (default: 2 seconds).

## Version Management

The project uses a single version number across all components. The version is defined in the root `CHANGELOG.md` and reflected in each implementation's build artifacts.

| Component  | Version Location                                              |
| ---------- | ------------------------------------------------------------- |
| Node       | `excel-api-node/package.json` → `version` field               |
| Java       | `excel-api-java/pom.xml` → `<version>` element                |
| C#         | `excel-api-csharp/src/ExcelApi/ExcelApi.csproj` → `<Version>` |
| Go         | `excel-api-go/internal/config/version.go` → `Version` const   |
| API Spec   | `docs/contract/openapi.yaml` → `info.version`                 |
