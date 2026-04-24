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
| **Requirements**           | Functional requirements, non-functional requirements, use cases          |
| → Requirements Analysis    | F/N/C categories and MoSCoW priority method                               |
| → Functional Requirements  | Specific system functions with priorities (F-xx)                          |
| → Non-Functional Requirements | Quality and operational criteria (N-xx)                                |
| → Use Cases                | Real-world scenarios with data flows (C-xx)                               |

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
| Column     | Vertical line of cells identified by letter (`A`–`ZZ`) or 1-based index |
| Record     | Data row in tabular mode, addressed by 1-based index among data rows    |
| Header     | One or more rows defining column identifiers, types, and descriptions   |
| Legend     | Separate sheet providing column metadata for a headerless data sheet    |
| Batch      | Group of write operations executed in a single file open/save cycle     |
| Lock       | Advisory file lock preventing concurrent writes from multiple processes |
| Lockfile   | Companion `.lock` file used for cross-process advisory locking          |
| Cache      | In-memory copy of workbook data served for read requests                |
| Debounce   | Delay before executing queued operations to accumulate a larger batch   |
| Scope      | Authorization permission level: `read`, `write`, `admin`                |

**Record** is a data row in tabular mode. Unlike a raw row (which is addressed by its Excel row number), a record is addressed by its 1-based index among data rows only, excluding header rows.

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
| Test Suite | TypeScript + Vitest  | `excel-api-test/`    | Black-box integration tests                |

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

**Record addressing** provides tabular access. A sheet is interpreted as a table with a header region and a data region. Rows in the data region are called records and addressed by 1-based index. Columns are addressed by their header identifier (text from the header row). This mode is used for CRUD operations on structured data.

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

The API supports three output formats controlled by the `format` query parameter.

**`format=native`** (default) — Values are returned as their native JSON types: strings, numbers, booleans, and null. Dates are returned as ISO 8601 strings with timezone if available in the cell.

**`format=display`** — Values are formatted according to the cell's `number_format` string (e.g., `1234.56` becomes `"1 234,56 zł"`). Display formatting is best-effort — the implementation applies the format string where possible and falls back to the native value otherwise.

**`format=string`** — All values are returned as strings regardless of their native type. This format provides consistent string representation with specific rules:
- Decimal numbers use dot as decimal separator (e.g., `"12345.654"`)
- Dates are formatted as `"YYYY-MM-DD"`
- Time values use 24-hour format: `"hh:mm:ss"` (e.g., `"13:12:31"`) or with milliseconds if precision requires: `"hh:mm:ss.fff"` (e.g., `"13:12:31.998"`)
- Combined date and time can be local time with milliseconds: `"YYYY-MM-DD hh:mm:ss.fff"` or ISO 8601 with timezone for UTC: `"YYYY-MM-DDThh:mm:ss.fffZ"`
- The server's local timezone is used by default unless the cell contains timezone information

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

Interactive mode provides connection management, workbook/sheet navigation, record and cell CRUD, and output formatting (JSON, CSV, Markdown tables). Batch mode enables scripted operations with configurable output format, separator, and text qualifier for CSV. The CLI can query usage and performance statistics from the server and display them as a table.

The CLI handles UTF-8 values including embedded newlines. In Markdown table output, newlines within cell values are replaced with a configurable marker (default: `<br>`). In CSV output, values containing the separator, qualifier, or newlines are enclosed in the text qualifier per RFC 4180.

## Integration Test Suite

**Excel API Test** (`excel-api-test/`). TypeScript test suite using Vitest, executing against any server implementation via HTTP. Tests are black-box — they know only the API contract, never the implementation.

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
| GET    | `/metrics`      | Usage and performance statistics      |

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

**`config.yaml`** contains non-sensitive settings: server port and TLS, workbook registry (file ID to path mapping, readonly flag, per-sheet header configuration), queue parameters (batch size, debounce, lock timeout), cache settings (invalidation strategy, poll interval), authorization mode, JWT issuer and expiration, logging level and format, OpenAPI metadata overrides (title, description, servers list), and lifecycle limit for development testing.

**`access.yaml`** contains sensitive data: JWT signing secret, OAuth2 client credentials and user password hashes (bcrypt), static token values with names and scopes, and ACL rules mapping scopes to allowed HTTP methods.

The separation ensures `access.yaml` can have restrictive file permissions (`0600`) while `config.yaml` can be safely committed to version control. Both files are validated at startup. Invalid configuration terminates the process with a descriptive error.

**Configuration Parameter Overriding**

Configuration parameters can be specified through three mechanisms with a strict override hierarchy: command line arguments take precedence over environment variables, which take precedence over configuration file values.

Override hierarchy (highest to lowest priority):
1. Command line arguments (e.g., `--port 8443`, `--life 30s`)
2. Environment variables (e.g., `PORT=8443`, `LIFE=30s`)
3. Configuration file values (e.g., `port: 8443`, `life: 30s` in `config.yaml`)

This hierarchy applies to all configurable parameters across all implementations.

**Lifecycle Management**

For development and testing purposes, all implementations support a lifecycle limit through the `--life` command line parameter, `LIFE` environment variable, or `life` configuration value in `config.yaml`. When specified, the service will stop gracefully after the specified duration.

The value must be in canonical duration format: `<number><unit>` where `<unit>` is `s` (seconds), `m` (minutes), or `h` (hours). Examples: `13s` for 13 seconds, `3m` for 3 minutes, `154h` for 154 hours.

Configuration override hierarchy for lifecycle limit: `--life` command line parameter (highest priority) > `LIFE` environment variable > `life` value in `config.yaml` (lowest priority).

When the lifecycle limit is reached, the service completes in-flight requests, closes connections, and exits with status code 0. This feature is intended for automated testing scenarios where services need to terminate after a fixed duration.

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

# Requirements

## Requirements Analysis

The requirements analysis covers three main categories.

**Functional requirements (F)** describe specific functions and operations the system must perform to support Excel file access via HTTP API and CLI.

**Non-functional requirements (N)** define quality and operational criteria such as security, reliability, performance, coding standards, and deployment standards.

**Use cases (C)** represent real-world scenarios the system must support, covering various combinations of functional requirements.

Among functional requirements, we distinguish **configuration requirements** (format, environment profiles), **operational requirements** (locking, batching, caching), **diagnostic requirements** (logs, verbose modes), and **API requirements** (endpoints, authorization).

Requirements are prioritized using the MoSCoW method:

- **Must Have (M)** - critical for MVP; without fulfillment the system cannot be deployed to production
- **Should Have (S)** - important for completeness; omission requires justification and stakeholder acceptance
- **Could Have (C)** - desirable requirements that improve usability; implemented if resources and time allow
- **Won't Have (W)** - consciously deferred beyond the current version; reserved for future iterations

Non-functional requirements form the foundations of the architecture and carry no MoSCoW priority. All of them are mandatory for meeting the project's quality and security standards.

## Functional Requirements

| ID   | Requirement                                                              | Priority |
| ---- | ------------------------------------------------------------------------ | -------- |
| F-01 | Configuration in YAML files (config.yaml, access.yaml)                   | M        |
| F-02 | Environment profiles with arbitrary names                                | S        |
| F-03 | Variable interpolation support in configuration files                    | S        |
| F-04 | Console logs with a defined format                                       | M        |
| F-05 | Verbose diagnostics mode                                                 | M        |
| F-06 | Trace mode                                                               | M        |
| F-07 | File logs with daily rotation                                            | S        |
| F-08 | Advisory file locking with lockfile protocol                             | M        |
| F-09 | Write queue with debounce batching                                       | M        |
| F-10 | In-memory cache with mtime invalidation                                  | M        |
| F-11 | OAuth2 authorization (client_credentials, password grants)              | M        |
| F-12 | Static token authorization                                              | M        |
| F-13 | JWT token validation and expiration handling                              | M        |
| F-14 | Scope-based access control (read, write, admin)                          | M        |
| F-15 | Cell-level addressing (A1, ranges)                                        | M        |
| F-16 | Record-level addressing (tabular mode)                                  | M        |
| F-17 | Configurable header rows (single, multi-row, legend, none)               | M        |
| F-18 | Value type preservation (string, number, boolean, date, formula)         | M        |
| F-19 | UTF-8 support including embedded newlines                               | M        |
| F-20 | Output formats (format=native/display/string query parameter)               | S        |
| F-21 | Formula cached value return                                              | M        |
| F-22 | Batch record operations (atomic execution)                               | M        |
| F-23 | Batch cell operations                                                   | M        |
| F-24 | Workbook registry (ID to path mapping)                                   | M        |
| F-25 | Readonly workbook flag                                                  | M        |
| F-26 | Dynamic OpenAPI endpoint with instance metadata                         | M        |
| F-27 | Health check endpoint with server time and timezone                      | M        |
| F-28 | Lock diagnostic endpoint (admin scope)                                   | S        |
| F-29 | CLI interactive REPL mode                                               | M        |
| F-30 | CLI batch mode (stdin/file input, stdout output)                         | M        |
| F-31 | CLI output formatting (JSON, CSV, Markdown, table)                       | M        |
| F-32 | CLI connection management and profiles                                  | S        |
| F-33 | CLI tab completion for workbooks, sheets, columns                        | S        |
| F-34 | CLI authentication persistence and token refresh                        | M        |
| F-35 | Integration test suite with black-box tests                             | M        |
| F-36 | Test fixtures for various Excel scenarios                                | M        |
| F-37 | Usage and performance statistics endpoint (market standard format)        | S        |
| F-38 | CLI statistics query command with table output                           | S        |

## Non-Functional Requirements

| ID   | Requirement                                                                                  | Type             |
| ---- | -------------------------------------------------------------------------------------------- | ---------------- |
| N-01 | SOLID principles, strict type checking, linting, and code formatting standards              | Code quality     |
| N-02 | Correct error handling in all layers; no uncontrolled exceptions                             | Reliability      |
| N-03 | HTTPS with certificate validation (configurable)                                             | Security         |
| N-04 | Docker container; image in a container registry                                              | Deployment       |
| N-05 | API specification in OpenAPI 3.1 format                                                     | Documentation    |
| N-06 | YAML configuration, environment profiles, separation of access file                         | Configurability  |
| N-07 | Safe cache invalidation and lockfile writing                                                | Reliability      |
| N-08 | English language in source code                                                              | Code convention  |
| N-09 | Cross-implementation interoperability (lockfile protocol, cache strategy)                   | Architecture     |
| N-10 | Performance targets (API response times, lock duration)                                      | Performance      |
| N-11 | Unit test coverage ≥ 80% per implementation                                                  | Quality          |
| N-12 | API contract test coverage 100%                                                              | Quality          |
| N-13 | C# test projects located in src directory alongside main project                              | Code convention  |

## Testing Standards

Each implementation uses its language-standard testing framework with project-specific conventions.

**Node.js** (`excel-api-node/`)
- Framework: Vitest (ESM-compatible test runner)
- Test location: `src/**/*.test.ts`
- Command: `npm test`
- Coverage target: ≥ 80%
- Test globals enabled via Vitest config

**Java** (`excel-api-java/`)
- Framework: JUnit 5 (Jupiter)
- Test location: `src/test/java/`
- Command: `mvn test`
- Coverage target: ≥ 80%
- Spring Boot Test starter included

**C#** (`excel-api-csharp/`)
- Framework: MSTest
- Test location: `src/ExcelApi.Test/` (test project alongside main project in src directory)
- Command: `dotnet test ExcelApi.sln`
- Coverage target: ≥ 80%
- Test project references main project via ProjectReference in solution

**Go** (`excel-api-go/`)
- Framework: Built-in `testing` package
- Test location: `*_test.go` files alongside source
- Command: `go test ./...`
- Coverage target: ≥ 80%
- No external test framework required

**Integration Tests** (`excel-api-test/`)
- Framework: TypeScript + Vitest
- Test location: `integration/*.test.ts`
- Command: `npm test`
- Coverage target: 100% of API contract
- Black-box tests against running server

All unit tests focus on implementation-specific logic (configuration loading, cache invalidation, file locking, Excel operations). Integration tests validate API contract compliance across all implementations.

## Use Cases

| ID   | Use Case                              | Short Description                                                                                      |
| ---- | ------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| C-01 | Read product catalog via API          | Retrieving product data from an Excel sheet via record-level API endpoints                              |
| C-02 | Batch update inventory levels         | Updating multiple inventory records via batch record operations to minimize file lock time             |
| C-03 | Export financial report to CSV       | Reading financial data from Excel and exporting to CSV format via CLI batch mode                      |
| C-04 | Concurrent read operations           | Multiple clients reading the same workbook simultaneously via cache                                |
| C-05 | CLI interactive session              | Interactive REPL for exploring workbooks, sheets, and performing ad-hoc operations                   |
| C-06 | CLI batch script processing          | Scripted data extraction and transformation using CLI batch mode with configurable output             |
| C-07 | Formula cell read with cached value  | Reading formula cells and returning cached values without evaluation                                 |
| C-08 | Multi-header sheet with legend       | Accessing a sheet with multiple header rows and a separate legend sheet for column metadata          |
| C-09 | CSV data import via CLI and API      | Importing historical order data from CSV files into Excel using CLI batch mode and API batch operations |
| C-10 | Query usage and performance statistics | Retrieving metrics on file operations, read/write times, record counts, and performance averages        |

### C-01 Read Product Catalog via API

Retrieving product data from an Excel sheet configured for tabular access via record-level API endpoints.

**Mechanisms used**: Record addressing, header configuration, GET /records endpoint.

**Data flow**

```
CLIENT
  ↓ [GET /workbooks/{id}/sheets/{sheet}/records]
API SERVER
  ↓ [Cache lookup]
CACHE
  ↓ [Return JSON]
CLIENT
```

### C-02 Batch Update Inventory Levels

Updating multiple inventory records in a single batch operation to minimize file lock duration and improve performance.

**Mechanisms used**: Batch record operations, write queue, debounce batching, file locking.

**Data flow**

```
CLIENT
  ↓ [POST /workbooks/{id}/sheets/{sheet}/operations with multiple record updates]
API SERVER
  ↓ [Enqueue in write queue]
WRITE QUEUE
  ↓ [Debounce timer expires or batch size reached]
BATCH EXECUTION
  ↓ [Acquire lock]
FILE LOCK
  ↓ [Open Excel, apply operations, save, refresh cache]
CACHE REFRESH
  ↓ [Release lock]
CLIENT
```

### C-03 Export Financial Report to CSV

Reading financial data from an Excel sheet and exporting it to CSV format using CLI batch mode for downstream processing.

**Mechanisms used**: CLI batch mode, record addressing, CSV formatter with RFC 4180 compliance.

**Data flow**

```
CSV FILE (stdout)
  ← [CLI batch mode]
CLI CLIENT
  ↓ [GET /records]
API SERVER
  ↓ [Cache lookup]
CACHE
```

### C-04 Concurrent Read Operations

Multiple clients reading the same workbook simultaneously without blocking, served from the in-memory cache.

**Mechanisms used**: In-memory cache, cache invalidation, read-only access.

**Data flow**

```
CLIENT A  → API SERVER → CACHE → Return data
CLIENT B  → API SERVER → CACHE → Return data
CLIENT C  → API SERVER → CACHE → Return data
```

### C-05 CLI Interactive Session

Interactive REPL mode for exploring workbooks, navigating sheets, and performing ad-hoc read and write operations with session context.

**Mechanisms used**: CLI REPL, session context management, tab completion, connection management.

**Data flow**

```
USER
  ↓ [Command input]
CLI REPL
  ↓ [Parse command, apply context]
HTTP CLIENT
  ↓ [API request]
API SERVER
  ↓ [Return result]
CLI FORMATTER
  ↓ [Format output]
USER
```

### C-06 CLI Batch Script Processing

Scripted data extraction and transformation using CLI batch mode with configurable output format (JSON, CSV, Markdown, table).

**Mechanisms used**: CLI batch mode, stdin/file input, stdout output, configurable formatters.

**Data flow**

```
SCRIPT FILE
  ↓ [Commands]
CLI BATCH MODE
  ↓ [Execute commands sequentially]
HTTP CLIENT
  ↓ [API requests]
API SERVER
  ↓ [Return results]
CLI FORMATTER
  ↓ [Format output]
STDOUT
```

### C-07 Formula Cell Read with Cached Value

Reading formula cells and returning cached values without re-evaluation, as formula evaluation is optional per implementation.

**Mechanisms used**: Cell addressing, formula cached value return, optional formula evaluation (Java only).

**Data flow**

```
CLIENT
  ↓ [GET /workbooks/{id}/sheets/{sheet}/cells/{ref}]
API SERVER
  ↓ [Cache lookup]
CACHE
  ↓ [Return cached value or null if unavailable]
CLIENT
```

### C-08 Multi-Header Sheet with Legend

Accessing a sheet configured with multiple header rows (identifiers, types, descriptions) and a separate legend sheet for column metadata.

**Mechanisms used**: Multi-header configuration, legend sheet, record addressing with type-aware column access.

**Data flow**

```
CLIENT
  ↓ [GET /workbooks/{id}/sheets/{sheet}/columns]
API SERVER
  ↓ [Read header rows and legend sheet]
EXCEL FILE
  ↓ [Return column definitions with types and descriptions]
CLIENT
```

### C-09 CSV Data Import via CLI and API

Importing historical order data from CSV files into an Excel workbook using CLI batch mode and API batch record operations for efficient writes.

**Description**: Order data including order ID, date, customer information, product details, quantity, unit price, and tax amount is imported from CSV files into an Excel sheet. The CLI batch mode parses the CSV and uses API batch operations to write multiple records efficiently, leveraging the write queue batching mechanism.

**Data structure**: Order ID, revision number, date, customer name, customer email, product name, quantity, unit price, tax amount.

**Mechanisms used**: CLI batch mode, CSV parsing, API batch record operations (POST .../operations), write queue batching, file locking.

**Data flow**

```
CSV FILE
  ↓ [CLI batch mode]
CLI CLIENT
  ↓ [Parse CSV, build batch operations]
HTTP CLIENT
  ↓ [POST /workbooks/{id}/sheets/{sheet}/operations]
API SERVER
  ↓ [Enqueue in write queue]
WRITE QUEUE
  ↓ [Debounce timer expires or batch size reached]
BATCH EXECUTION
  ↓ [Acquire lock]
FILE LOCK
  ↓ [Open Excel, apply operations, save, refresh cache]
EXCEL FILE
```

### C-10 Query Usage and Performance Statistics

Retrieving metrics on file operations, read/write times, record counts, and performance averages for monitoring and diagnostics.

**Description**: The API exposes usage and performance statistics in a market-standard format (e.g., Prometheus/OpenMetrics). Metrics include time taken for last XLSX file update, time taken for reading files, number of records read/written per operation, average response times, queue depths, cache hit rates, and lock wait times. The CLI can query these statistics and display them as a table for quick analysis.

**Metrics tracked**:
- File operation times (read, write, cache refresh) with min/max/avg/p95/p99
- Record counts (records read, records written, records per batch)
- Queue metrics (queue depth, batch size, debounce wait time)
- Cache metrics (hit rate, miss rate, refresh count, invalidation count)
- Lock metrics (acquisition time, wait time, contention count)
- API metrics (request count by endpoint, response time, error rate)
- System metrics (uptime, memory usage, file handles)

**Mechanisms used**: Metrics collection endpoint, market-standard format (OpenMetrics/Prometheus), CLI statistics query command, table formatter.

**Data flow**

```
CLI / MONITORING SYSTEM
  ↓ [GET /metrics]
API SERVER
  ↓ [Return metrics in OpenMetrics format]
CLI FORMATTER
  ↓ [Parse and display as table]
USER
```
