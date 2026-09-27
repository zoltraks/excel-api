# Testing Strategy

## Test Environment Setup

**Work Directory Requirement**

For testing purposes, always use the `work` directory in the project repository root.
Never create example files, temporary files, or scripts in the project directory.
The `work` directory is git-ignored and safe for test environments.

Allowed: Create directory structure and test files in `work/`
Forbidden: Create test files or temporary files in the project root or source directories

**Implementation Execution**

Run every implementation from its own directory.
The `work` directory is at the repository root, outside implementation directories.
When running implementations for testing, use `--work ../work` to point to the repository root work directory.

## Verification Loop

This is the canonical procedure for confirming a change is correct.

Run it for every affected component after every source, configuration, or test change.
Repeat the loop until every step passes with zero errors and zero warnings.
A source, configuration, or test change made after a clean run invalidates the result - the loop must run again.
Work is complete only when the loop is clean for every component the change touched.

**Typecheck**

- Node: `npm run type-check`
- Java: `mvn compile`
- C#: `dotnet build`
- Go: `go build ./...`
- Test suite: `npx tsc --noEmit`

**Lint**

- Node: `npm run lint` and `npm run format`
- Java: `mvn checkstyle:check`
- C#: `dotnet format --verify-no-changes`
- Go: `gofmt -l .` (must print nothing) and `go vet ./...`
- Test suite: no linter configured - typecheck only

**Test**

- Node: `npm test -- --run`
- Java: `mvn test`
- C#: `dotnet test`
- Go: `go test ./...`
- Integration: `IMAGE=<implementation> docker compose -f docker-compose.test.yaml up --abort-on-container-exit`

**Static Analysis**

- Node: strict `tsc --noEmit` and ESLint findings count as static analysis - both must be clean
- Java: checkstyle findings - must be clean; extend with SpotBugs if the plugin is later configured
- C#: built-in SDK analyzers run during `dotnet build` - warnings must be zero
- Go: `go vet ./...`; additionally `golangci-lint run` when it is installed

**Production Build**

- Node: `npm run build` (emits `dist/`)
- Java: `mvn package` (emits `target/*.jar`)
- C#: `dotnet publish -c Release`
- Go: `CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o bin/excel-api-go ./cmd/excel-api-go`
- Container artifact, when the change is release-bound: `docker build -t excel-api-<implementation> ./excel-api-<implementation>/`

**Fix**

Address every error and warning, then repeat the loop until clean.

## Security Checks

Security checks are a required gate, not optional.
Run them when the change touches authentication, authorization, file handling, dependencies, or network-facing code, and whenever the user requests them.
Resolve findings or obtain explicit owner approval with a recorded rationale before completion.

**Dependency analysis**

- Node and test suite: `npm audit`
- Java: `mvn org.owasp:dependency-check-maven:check` (on demand, no plugin pin configured)
- C#: `dotnet list package --vulnerable`
- Go: `govulncheck ./...` when the tool is installed

**Static security analysis**

No dedicated SAST tool is configured.
Review the changed code manually: input validation at API boundaries, path handling on workbook and lock paths, secret handling in `access.yaml`, and license compatibility of any new dependency against `docs/COPYRIGHTS.md`.

## Integration Tests

The `excel-api-test/` directory contains black-box integration tests written in TypeScript with Jest.
Tests communicate with the server exclusively via HTTP and are unaware of the implementation.

Each implementation is tested using the same test suite.
A passing suite confirms contract conformance.

**Running tests:**

```bash
IMAGE=excel-api-node docker compose -f docker-compose.test.yaml up --abort-on-container-exit
```

Replace `excel-api-node` with `excel-api-java` or `excel-api-csharp` to test other implementations.

## CLI Utility Testing

The Go CLI (`excel-api-go`) can be used to manually test implementations and validate API responses.
This provides an additional testing method beyond the automated integration test suite.

**Building the CLI:**

See `docs/standard/go-cli-development.md` for build instructions including Windows-specific requirements.

**Running CLI tests against a running implementation:**

```bash
# Start an implementation
IMAGE=excel-api-node docker compose up

# In another terminal, test with CLI
./excel-api-go/excel-api-go -server http://localhost:8443 -list-workbooks
./excel-api-go/excel-api-go -server http://localhost:8443 -get-cell workbook1:sheet1:A1
./excel-api-go/excel-api-go -server http://localhost:8443 -set-cell workbook1:sheet1:A1:42
```

**CLI REPL mode for interactive testing:**

```bash
./excel-api-go/excel-api-go -server http://localhost:8443 -token test-static-token -repl
```

## Test Fixtures

Pre-built Excel files in `excel-api-test/fixture/`:

| File             | Contents                                                   |
| ---------------- | ---------------------------------------------------------- |
| `simple.xlsx`    | Single sheet, one header row, 10 data rows, no formulas   |
| `styled.xlsx`    | Rows with fonts, colors, borders, number formats           |
| `formulas.xlsx`  | Cells with formulas and cached values                      |

## Test Configuration

Test-specific configuration files in `excel-api-test/config/`:

- `config.test.yaml` — points to fixture directory, enables both auth modes
- `access.test.yaml` — test OAuth2 clients, users, and static tokens

## Test Scenarios

| Suite                      | Scope                                                   |
| -------------------------- | ------------------------------------------------------- |
| `auth.test.ts`             | OAuth2 flows, JWT validation, static tokens, scope check|
| `workbooks.test.ts`        | Workbook listing, details, readonly flag                |
| `sheets.test.ts`           | Sheet metadata, column definitions, header modes        |
| `rows.test.ts`             | Record CRUD, style preservation, pagination             |
| `operations.test.ts`       | Batch operations, atomicity, index reconciliation       |
| `openapi-endpoint.test.ts` | Dynamic OpenAPI serving, field replacement              |
| `locking.test.ts`          | Lock acquisition, timeout, lockfile content             |
| `concurrency.test.ts`      | Concurrent writes to the same workbook                  |

## Unit Tests

Each implementation maintains its own unit test suite within its project directory.
Unit tests are written in the implementation's native testing framework: Vitest (Node), JUnit (Java), MSTest (C#), Go test (Go).

Coverage target: ≥ 80% for all implementations.

## Environment Variables

| Variable                    | Default                    |
| --------------------------- | -------------------------- |
| `API_URL`                   | `http://excel-api:8443`    |
| `EXCEL_API_TEST_CLIENT_ID`  | `test-client`              |
| `EXCEL_API_TEST_SECRET`     | `test-secret`              |
| `EXCEL_API_TEST_USERNAME`   | `testuser`                 |
| `EXCEL_API_TEST_PASSWORD`   | `testpass`                 |
| `EXCEL_API_TEST_TOKEN`      | `test-static-token`        |
