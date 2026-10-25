# Testing

## Environment Notes

Facts verified on this development machine - they gate the verification loop
and are worth checking before diagnosing a failure as a code defect.

- **Java toolchain**: only a current JDK is installed (JDK 27 via Homebrew);
  Mockito cannot subclass-mock concrete classes on it - tests mock
  interfaces or construct real objects (`LifecycleManagerTest` is the
  precedent).
- **.NET runtime**: `dotnet test` needs `DOTNET_ROLL_FORWARD=Major` - the
  `net8.0` runtime is absent while the .NET 10 SDK is installed.
- **Rust toolchain**: `excel-api-rust/rust-toolchain.toml` pins channel `1.89` -
  rustup resolves it automatically. `cargo audit` reads advisory ignores from
  `excel-api-rust/.cargo/audit.toml` - re-evaluate each entry on every
  dependency bump.
- **npm audit**: run plain `npm audit fix` - the `--omit=dev` flag prunes
  `devDependencies` from `node_modules` and breaks the test suite.
- **access.yaml permissions**: checked-out `access.yaml` files must be
  `chmod 600` or the servers warn about insecure permissions.
- **C# example server**: `work/example/` holds a ready environment - run the
  published binary with `--work work/example` on `http://localhost:8443`.
- **Java binary**: `java` on PATH is a macOS stub - run jars with the JDK 27
  binary at `/opt/homebrew/Cellar/openjdk/27/libexec/openjdk.jdk/Contents/Home/bin/java`
  or set `JAVA_HOME` first.
- **Incremental Maven builds**: `mvn compile` can report success on stale
  classes after source edits - verify syntax-level changes with
  `mvn clean compile` and never measure the exit code through a pipe
  (`mvn ... | tail` reports `tail`'s status, not Maven's).
- **Integration without Docker**: the Docker daemon is absent - run each
  server natively against a copied `work/itest/` environment
  (`fixture/` + `config.yaml` + `access.yaml` from `excel-api-test/config/`,
  `access.yaml` chmod 600) and drive the suite with
  `API_URL=http://localhost:8443/api/v1 npx jest --runInBand` from
  `excel-api-test/`.
- **Fixture hygiene**: the suite's write tests mutate `fixture/` workbooks -
  restore clean copies between reruns or stale rows make delete/insert tests
  fail on leftover data.
- **Mechanical rewrites**: bulk regex rewrites of Java source are hazardous -
  the 0.0.6 window saw a `Map.of` replacement eat closing parens and a `}`
  anchor duplicate a method five times while incremental compile still
  passed; always follow bulk rewrites with a clean compile plus checkstyle.
## Verification Strategy

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

No hosted CI/CD pipeline is configured for this repository — this is a deliberate, owner-approved decision.
The manual verification loop below is the required quality gate for every change and must run before any release.

Run it for every affected component after every source, configuration, or test change.
Repeat the loop until every step passes with zero errors and zero warnings.
A source, configuration, or test change made after a clean run invalidates the result - the loop must run again.
Work is complete only when the loop is clean for every component the change touched.

The Java commands assume `JAVA_HOME` resolves to JDK 21 or newer — the build fails
early and clearly when an older or absent runtime is picked up.

**Typecheck**

- Node: `npm run type-check`
- Java: `mvn compile`
- C#: `dotnet build`
- Rust: `cargo check`
- Go: `go build ./...`
- Test suite: `npx tsc --noEmit`

**Lint**

- Node: `npm run lint` and `npm run format`
- Java: `mvn checkstyle:check`
- C#: `dotnet format --verify-no-changes`
- Rust: `cargo fmt --check --all` and `cargo clippy --all-targets -- -D warnings`
- Go: `gofmt -l .` (must print nothing) and `go vet ./...`
- Test suite: no linter configured - typecheck only

**Test**

- Node: `npm test -- --run`
- Java: `mvn test`
- C#: `dotnet test` — the test host needs the target-framework runtime; when only a newer SDK/runtime is installed, prefix `DOTNET_ROLL_FORWARD=LatestMajor`
- Rust: `cargo test`
- Go: `go test ./...`
- Integration: `IMAGE=<implementation> docker compose -f docker-compose.test.yaml up --abort-on-container-exit`

**Static Analysis**

- Node: strict `tsc --noEmit` and ESLint findings count as static analysis - both must be clean
- Java: checkstyle findings - must be clean; extend with SpotBugs if the plugin is later configured
- C#: built-in SDK analyzers run during `dotnet build` - warnings must be zero
- Rust: clippy findings plus the crate lints declared in `Cargo.toml` (`unwrap_used`, `expect_used`, `panic` denied) - warnings must be zero
- Go: `go vet ./...`; additionally `golangci-lint run` when it is installed

**Production Build**

- Node: `npm run build` (emits `dist/`)
- Java: `mvn package` (emits `target/*.jar`)
- C#: `dotnet publish -c Release`
- Rust: `cargo build --release` (emits `target/release/excel-api-rust`)
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
- Rust: `cargo audit` - advisory ignores live in `excel-api-rust/.cargo/audit.toml`
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

Replace `excel-api-node` with `excel-api-java`, `excel-api-csharp`, or `excel-api-rust` to test other implementations.

## Cross-Implementation Verification

Beyond conformance per implementation, the four servers can run against one
shared workbook directory to verify file-level interoperability: one
implementation writes, every other implementation reads.

**Shared environment** (example layout under `work/itest/`, gitignored):

- One `fixture/` directory copied from `excel-api-test/fixture/` - all
  servers point at the same files.
- One shared `locks/` directory - lockfile serialization crosses server
  processes.
- One shared `access.yaml` - every server validates the same JWT secret.
- One config per implementation (`config.node.yaml`, `config.java.yaml`,
  `config.csharp.yaml`, `config.rust.yaml`) - each a copy of
  `config.test.yaml` with only the `server.port` (and matching
  `openapi.servers` URL) changed.

**Port convention**: node 4801, java 4802, csharp 4803, rust 4804.

**Path resolution**: `--config` and `--access` paths resolve against the
`--work` directory - pass work-relative names (e.g. `--config
config.node.yaml`), not cwd-relative paths, or they resolve doubled.

**Authentication**: obtain a bearer token per server with the OAuth2
client-credentials grant - `POST /api/v1/auth/token` with
`grant_type=client_credentials&client_id=test-client&client_secret=test-secret`.
The static `test-static-token` in the test access file is expired by
design and returns `TOKEN_EXPIRED`.

**Build artifacts**: rebuild every artifact before the matrix, then
confirm the running binary via `GET /api/v1/health` (`implementation`,
`version` fields). Java serves the packaged jar - `mvn package`, not just
`compile`. C# publishes to a RID-specific directory
(`bin/Release/net8.0/<rid>/`). A stale artifact can pass health while
running outdated code.

**Fixture restore**: the Jest suite and the matrix both mutate workbooks -
re-copy `excel-api-test/fixture/*.xlsx` into the shared fixture directory
between runs.

**Matrix procedure** (scripted in `shell/cross_test.py`):

```bash
# start all four servers against the shared work dir, then:
python3 shell/cross_test.py
# ports overridable: CROSS_PORTS="node=4801 rust=4804" python3 shell/cross_test.py
```

The script writes a distinctive cell and record through every
implementation and reads them back through every other implementation
(4x3 ordered pairs each), then verifies `lock-status` reports
`locked: false` after the matrix - proving shared lockfiles serialize
and release correctly across processes. Exit code is 0 on ALL PASS.

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
| `multi-header.xlsx` | Shared multi-mode fixture: `none`, `single`, `multi`, `legend` header-mode sheets |
| `csv/orders/`    | CSV workbook fixture                                       |

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
Unit tests are written in the implementation's native testing framework: Vitest (Node), JUnit (Java), MSTest (C#), `#[test]`/`#[tokio::test]` (Rust), Go test (Go).

Coverage target: ≥ 80% for all implementations.

## Environment Variables

| Variable                    | Default                    |
| --------------------------- | -------------------------- |
| `API_URL`                   | `http://excel-api:8443`    |
| `API_PATH`                  | `/api/v1`                  |
| `EXCEL_API_TEST_CLIENT_ID`  | `test-client`              |
| `EXCEL_API_TEST_SECRET`     | `test-secret`              |
| `EXCEL_API_TEST_USERNAME`   | `testuser`                 |
| `EXCEL_API_TEST_PASSWORD`   | `testpass`                 |
| `EXCEL_API_TEST_TOKEN`      | `test-static-token`        |

### Full parity matrix

`shell/parity_test.py` (stdlib-only, `CROSS_PORTS` env-overridable) exercises all 17 contract operations plus error cases across 4801-4804 with normalized diffs. Known artifacts: `openapi.yaml` served bodies differ only when implementations customize (now verbatim across all four), and sequential shared-file writes are fixture-restored per impl for add/del checks.
