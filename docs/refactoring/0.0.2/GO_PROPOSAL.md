# Go CLI Refactoring Proposal

## Problem

The Go CLI has a monolithic `main.go` that violates `docs/standard/go-cli-development.md`, and existing `internal/` packages are largely empty stubs.

- `excel-api-go/cmd/excel-api-go/main.go` is ~28 KB and contains 22+ top-level functions: argument parsing, OAuth2 token retrieval, all command implementations (`listWorkbooksCmd`, `getCellCmd`, `setCellCmd`, `addRecordCmd`, `updateRecordCmd`, `deleteRecordCmd`, `getRangeCmd`, `listRecordsCmd`, `getRecordCmd`, `showStatistics`, etc.), REPL loop, REPL dispatcher, completion generator, formatters (`formatAsCSV`, `formatAsMarkdown`, `formatAsTable`), profile loading, and config path resolution.
- `internal/cli/repl.go` is an empty 79-byte stub while the real REPL (`runREPL`, `printREPLHelp`, `executeREPLCommand`) lives in `main.go`.
- `internal/format/markdown.go` is a 108-byte stub while real markdown/CSV/table formatters live in `main.go`.
- `internal/client/client.go` (462 bytes) is minimal while a full HTTP client with OAuth2 flow is embedded in `main.go`.
- Config path resolution (`loadProfile`, `resolveConfigPath`) is duplicated between `main.go` and `internal/config/config.go`.
- Each command function repeats the same request-response plumbing (build request, add Authorization header, execute, decode JSON, handle error). No shared helper.
- The `main.go` function is too long to be unit-tested as a whole; only `main_test.go` (2.9 KB) covers limited cases.

## Goal

- Reduce `cmd/excel-api-go/main.go` to orchestration only: flag parsing, dispatch to a command table, exit-code handling. Target size: under 200 lines.
- Populate `internal/` packages to match their names and the structure implied by `docs/standard/go-cli-development.md`:
  - `internal/client/` — HTTP client with OAuth2 token flow, typed methods per endpoint (`ListWorkbooks`, `GetWorkbook`, `GetCell`, `SetCell`, `GetRange`, `ListRecords`, `GetRecord`, `AddRecord`, `UpdateRecord`, `DeleteRecord`, `GetStatistics`).
  - `internal/cli/` — REPL implementation (`Run`, help, command dispatch, completion generation).
  - `internal/cli/commands/` — one file per sub-command; each exposes a function that takes a `*client.Client` and parsed args, writes to stdout.
  - `internal/format/` — CSV, Markdown, table formatters.
  - `internal/config/` — profile loading, config-path resolution (move duplicated logic out of `main.go`).
- Add unit tests for every new package.

## Plan

**Step 1 — Extract HTTP client**

- Move OAuth2 token request (`obtainToken`) and per-endpoint request helpers into `internal/client/`.
- Define typed request/response structs under `internal/client/types.go`.
- Replace all inline `http.NewRequest` / `client.Do` code in `main.go` command functions with calls to the client.
- Add unit tests using `httptest.Server`.

**Step 2 — Extract formatters**

- Move `formatAsCSV`, `formatAsMarkdown`, `formatAsTable` into `internal/format/`.
- Replace stub `markdown.go` with real implementation; add `csv.go` and `table.go`.
- Add table-driven tests for each formatter.

**Step 3 — Extract config helpers**

- Move `loadProfile` and `resolveConfigPath` from `main.go` into `internal/config/`.
- Remove the duplicated implementations from `main.go`.
- Ensure all existing `internal/config/config_test.go` tests still pass and add new cases.

**Step 4 — Extract commands**

- For each command create `internal/cli/commands/<command>.go` exporting a function with a stable signature.
- Move command body out of `main.go` into the new package.
- Each command depends only on `client`, `format`, and `config`.
- Add unit tests per command using mocked client.

**Step 5 — Extract REPL**

- Move `runREPL`, `printREPLHelp`, `executeREPLCommand`, `generateCompletion` into `internal/cli/`.
- Replace the stub `internal/cli/repl.go`.
- Unit test REPL dispatch with a synthetic reader.

**Step 6 — Slim main**

- `main.go` becomes: flag parsing, resolve config/profile, build `client.Client`, dispatch to command function or enter REPL, translate errors to exit codes.
- Keep binary behavior identical.

**Step 7 — Verification**

- `go build ./...`
- `go vet ./...`
- `go fmt ./...` (no changes required)
- `go test ./...`
- Build `bin/excel-api-go.exe` (per `docs/GUIDELINES.md` binary output rule) and verify against each running server.

## Risk

- **Behavior drift in HTTP client**: Subtle details such as Authorization header prefix (`Bearer` vs `Token`), form encoding, and error handling must match the existing implementation exactly. Tests against a `httptest.Server` are essential.
- **Exit codes**: `main.go` currently handles errors ad hoc. Centralizing error-to-exit-code mapping must preserve current behavior (0 on success, non-zero on failure).
- **REPL input parsing**: Token-splitting rules for quoted strings are embedded in `executeREPLCommand`. They must be preserved verbatim.
- **Binary output location**: Per `docs/GUIDELINES.md`, binaries must go to `excel-api-go/bin/`. The current workflow already respects this; verify after the refactor.

## Acceptance Criteria

- `cmd/excel-api-go/main.go` is under 200 lines.
- `internal/client/`, `internal/cli/`, `internal/cli/commands/`, `internal/format/`, `internal/config/` each contain real implementations (no stubs) with `*_test.go` files.
- No HTTP calls or JSON decoding directly in `main.go`.
- No formatter code in `main.go`.
- No duplicated profile / config-path resolution between `main.go` and `internal/config/`.
- `go build ./...`, `go vet ./...`, `go test ./...` all pass with no warnings.
- Binary built to `excel-api-go/bin/excel-api-go.exe`.
- `./bin/excel-api-go.exe --list-workbooks` returns 4 workbooks from each running server (Node, Java, C#).
- Unit test coverage for `internal/client`, `internal/format`, `internal/cli/commands` ≥ 80 %.
