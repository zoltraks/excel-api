# Integration Test Suite

**Type**: Fix

**Summary**: Five of eight integration spec files contain `expect(true).toBe(true)` placeholders, `UnitTest1.cs` is an empty MSTest scaffold, and Node's `server.test.ts` duplicates `parseDuration` instead of importing it. Implement the declared scenarios so the suite is a real regression gate.

**Description**:

Audit finding FND-CQY-005 / recommendation REC-013.

- Implement real assertions in `excel-api-test/integration/` for the placeholder specs: `concurrency.test.ts`, `locking.test.ts`, `operations.test.ts`, `rows.test.ts`, `sheets.test.ts` — covering record CRUD, style preservation, lock-status, concurrent writes, batch operations, and sheet metadata per `docs/TESTING.md` scenarios.
- Tests must pass against all three servers via `IMAGE=<impl> docker compose -f docker-compose.test.yaml up --abort-on-container-exit`.
- Remove `excel-api-csharp/src/ExcelApi.Test/UnitTest1.cs`.
- `excel-api-node/src/server.test.ts` must import `parseDuration` from `util/duration.ts` rather than re-implementing it.
- The suite must fail when a seeded defect is introduced (spot-check one assertion against a deliberately broken behavior).

## Out of Scope

- Coverage tooling/report thresholds.
- New scenario categories beyond the declared T-02..T-08 set.
