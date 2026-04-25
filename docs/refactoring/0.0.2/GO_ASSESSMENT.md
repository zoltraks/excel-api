# Go CLI Refactoring Assessment

## Verification

All acceptance criteria verified on 2026-04-25.

**Build:** `go build ./...` — clean, no errors.

**Vet:** `go vet ./...` — clean, no warnings.

**Tests:** `go test ./...` — all packages passed: `cmd/excel-api-go`, `internal/cli`, `internal/client`, `internal/config`, `internal/format`.

**Runtime:** Binary at `excel-api-go/bin/excel-api-go.exe`. Returned 4 workbooks from all three running server implementations (Node, Java, C#) during lifecycle-limited test runs.

## Proposal Outcomes

**Step 1 — Extract HTTP client.** Complete.

- `internal/client/client.go` exists (265 lines, 8.7 KB). Contains typed per-endpoint methods.
- `internal/client/types.go` exists (31 lines) with request/response structs.
- OAuth2 token flow and per-endpoint request helpers live in `internal/client/`.
- `internal/client/client_test.go` and `internal/client/http_test.go` exist with unit tests using `httptest.Server`.
- `main.go` contains no inline `http.NewRequest` / `client.Do` calls.

**Step 2 — Extract formatters.** Complete.

- `internal/format/markdown.go` exists (95 lines, 2.3 KB) — real implementation, not a stub.
- `internal/format/format_test.go` exists (2.2 KB) with table-driven tests.
- No CSV (`csv.go`) or plain-text table (`table.go`) formatter files exist as separate files. All formatter logic is in `markdown.go`. The proposal called for separate files per format type.

**Step 3 — Extract config helpers.** Complete.

- `internal/config/config.go` exists (77 lines, 2.1 KB) with profile loading and path resolution.
- `internal/config/config_test.go` exists (2.9 KB).
- No duplication between `main.go` and `internal/config/`.

**Step 4 — Extract commands.** Not implemented.

- No `internal/cli/commands/` subdirectory exists.
- `main.go` is 183 lines. While substantially reduced from the original ~28 KB monolith, command dispatch logic remains in `main.go` (flag parsing, command selection, output).
- The proposal target was under 200 lines. At 183 lines, `main.go` meets the size target, but the structural goal (commands as separate files under `internal/cli/commands/`) was not achieved.

**Step 5 — Extract REPL.** Complete.

- `internal/cli/repl.go` exists (204 lines, 6.3 KB). Contains `RunREPL`, help printing, command dispatch, and completion generation.
- `internal/cli/repl_test.go` exists (1.3 KB).
- The stub has been replaced with a real implementation.

**Step 6 — Slim main.** Substantially complete.

- `main.go` is 183 lines (6.4 KB), within the 200-line target.
- No HTTP calls or JSON decoding directly in `main.go`.
- No formatter code in `main.go`.
- No profile/config-path duplication.
- Command function bodies remain in `main.go` rather than being moved to `internal/cli/commands/`.

**Step 7 — Verification.** Complete.

- Build, vet, tests, and runtime verification all pass.
- Binary at `excel-api-go/bin/excel-api-go.exe`.

## Remaining Gaps

**No `internal/cli/commands/` package.** Command implementation functions (`listWorkbooksCmd`, `getCellCmd`, `getRangeCmd`, etc.) remain in `main.go`. The proposal specified one file per sub-command under `internal/cli/commands/`, each depending only on `client`, `format`, and `config`. This is the primary structural gap.

**Single formatter file.** All output formatting is in `internal/format/markdown.go`. The proposal called for separate `csv.go` and `table.go` files. The current single-file arrangement works but does not match the intended module structure from `docs/standard/go-cli-development.md` and `docs/SPECIFICATION.md`.

**No per-command unit tests.** The proposal required unit tests per command using a mocked client. No mock-based command tests exist. Coverage for the command layer depends on end-to-end CLI tests only.

## Quality State

| Check             | Result |
| ----------------- | ------ |
| Build             | ✓      |
| Vet               | ✓      |
| Unit tests        | ✓      |
| Runtime lifecycle | ✓      |
| CLI verification  | ✓      |

## Conclusion

The Go CLI refactoring has made substantial progress: the HTTP client, REPL, config helpers, and formatters have all been moved into `internal/` packages with tests. `main.go` meets the 200-line size target and contains no HTTP, JSON, or formatter logic. The primary open item is extracting command implementations from `main.go` into `internal/cli/commands/`, which would complete the structural goal and enable per-command unit testing with a mocked client.
