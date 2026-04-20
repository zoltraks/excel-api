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

## Error Response Envelope

All error responses follow the format defined in PROJECT.md. The `error` field is a machine-readable code. The `message` field is a human-readable description. The `details` field is an optional object with additional context (e.g., which field failed validation, which operation in a batch failed).

Implementations must not include stack traces, internal class names, or filesystem paths in error responses.
