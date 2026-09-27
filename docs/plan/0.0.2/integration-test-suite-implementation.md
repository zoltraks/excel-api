# Integration Test Suite — Implementation Plan

**Change Request Reference**: `docs/change/0.0.2/integration-test-suite.md`

**Best Practices**: `docs/TESTING.md` scenarios table; Jest suite conventions in `excel-api-test/`; fixtures in `excel-api-test/fixture/`.

**Documentation Updates**: `docs/TESTING.md` scenario table verified against implemented specs.

**Step by Step Implementation**:

1. **Implement placeholder specs**
   - `concurrency.test.ts` — parallel writes to one workbook serialize without corruption.
   - `locking.test.ts` — lock acquisition, timeout, lockfile content fields.
   - `operations.test.ts` — batch record/cell ops, atomicity, `BatchResult` shape.
   - `rows.test.ts` — record CRUD, `after_row` insert preservation, pagination.
   - `sheets.test.ts` — sheet metadata, column definitions, header modes.
   - Files: `excel-api-test/integration/*.test.ts`.

2. **Remove C# scaffold**
   - Delete `excel-api-csharp/src/ExcelApi.Test/UnitTest1.cs`.

3. **Fix Node test duplication**
   - `server.test.ts` imports `parseDuration` from `util/duration.ts` instead of inlining a copy.
   - Files: `excel-api-node/src/server.test.ts`.

4. **Run against all three servers**
   - `IMAGE=excel-api-node|excel-api-java|excel-api-csharp docker compose -f docker-compose.test.yaml up --abort-on-container-exit`.

**Testing Strategy**: This change is the test suite itself; verified by green runs on all three images.

**Verification**: `docs/TESTING.md` integration path; unit-level loop N/A (test-only + one prod-source test file).
