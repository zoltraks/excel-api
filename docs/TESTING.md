# Testing Strategy

## Integration Tests

The `excel-api-test/` directory contains black-box integration tests written in TypeScript with Jest.
Tests communicate with the server exclusively via HTTP and are unaware of the implementation.

Each implementation is tested using the same test suite.
A passing suite confirms contract conformance.

**Running tests:**

```bash
IMPL=excel-api-node docker compose -f docker-compose.test.yaml up --abort-on-container-exit
```

Replace `excel-api-node` with `excel-api-java` or `excel-api-csharp` to test other implementations.

## Test Fixtures

Pre-built Excel files in `excel-api-test/fixture/`:

| File             | Contents                                                   |
| ---------------- | ---------------------------------------------------------- |
| `simple.xlsx`    | Single sheet, one header row, 10 data rows, no formulas   |
| `styled.xlsx`    | Rows with fonts, colors, borders, number formats           |
| `formulas.xlsx`  | Cells with formulas and cached values                      |
| `large.xlsx`     | Single sheet with 10,000+ rows for performance testing     |

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
Unit tests are written in the implementation's native testing framework: Jest (Node), JUnit (Java), xUnit (C#).

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
