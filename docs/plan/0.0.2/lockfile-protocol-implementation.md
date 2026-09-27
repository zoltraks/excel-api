# Lockfile Protocol — Implementation Plan

**Change Request Reference**: `docs/change/0.0.2/lockfile-protocol.md`

**Best Practices**: `docs/standard/ts-node-development.md`, `docs/standard/java-spring-maven-development.md`, `docs/standard/csharp-aspnet-development.md`. `docs/ARCHITECTURE.md` lockfile protocol is the spec.

**Documentation Updates**: `docs/ARCHITECTURE.md` if the lockfile field is documented as `timestamp` (reconcile to `locked_at`); verify `docs/SPECIFICATION.md` per-server lock sections.

**Step by Step Implementation**:

1. **Node: atomic acquire + `locked_at`**
   - Replace `existsSync`+`writeFileSync` check-then-create with exclusive-create (`fs.writeFileSync(path, data, { flag: 'wx' })` — throws `EEXIST` when held). Rename payload field `timestamp`→`locked_at`. Honor foreign locks; stale expiry on `locked_at`. Tolerate malformed lockfiles.
   - Files: `excel-api-node/src/lock/lockfile.ts`.

2. **Java: implement locking**
   - New `LockManager` (or existing stub): `Files.createFile`/`CREATE_NEW` exclusive create, `{pid, hostname, locked_at, implementation}` JSON payload, stale-expiry, release-on-finally around `workbook.write`.
   - Files: `excel-api-java/.../excel/LockManager.java` (or `service/`), wired into `ExcelService` write methods.

3. **C#: implement locking**
   - `FileMode.CreateNew` exclusive create, same payload schema, stale-expiry, release around `Save`.
   - Files: `excel-api-csharp/src/ExcelApi/Services/ExcelService.cs` + new `Excel/LockManager.cs` (or `Lock/`).

4. **Real lock-status**
   - `GET /workbooks/{id}/lock-status` reports `locked`, `locked_at`, owner fields, and `queue_depth` (real value lands with `batch-operations`; until then report queue 0 only if queue isn't wired — prefer wiring order). Remove Java `LockStatusController` TODO.
   - Files: `excel-api-java/.../controller/LockStatusController.java`, C# `Endpoints/WorkbookEndpoints.cs`, Node `routes/lockStatus.ts`.

**Testing Strategy**: Unit tests: atomic acquire blocks second acquirer, foreign-lock honored, stale expiry releases; concurrency spec lands in `integration-test-suite`.

**Verification**: `docs/TESTING.md` loop on all three servers + security gate (integrity of shared state).
