# Lockfile Protocol

**Type**: Feature

**Summary**: Write serialization is absent or racy: Java and C# take no lock, and Node's acquire is a non-atomic check-then-create using a `timestamp` field that diverges from the documented `locked_at` schema. Implement the atomic, interoperable lockfile protocol in all three servers.

**Description**:

Audit finding FND-SEC-008 / recommendation REC-012.

- Lockfile creation must be atomic: exclusive-create semantics (`wx` flag / `CREATE_NEW` / `FileMode.CreateNew`), not check-then-create.
- The lockfile payload must match the documented shape `{pid, hostname, locked_at, implementation}` — rename Node's `timestamp` to `locked_at`.
- All servers must honor foreign-held locks regardless of which implementation created them, with stale-lock expiry per `lock_timeout_ms`.
- Node's stale check must read `locked_at`; keep a defensive parse for malformed lockfiles.
- `GET /workbooks/{id}/lock-status` must report real lock state in all three servers — replace the Java `TODO` stub and ensure consistent `locked`/`locked_at`/`queue_depth` fields per the `LockStatus` schema.
- Accept: two concurrent writers on one workbook serialize; a foreign lock blocks writes until stale expiry.

## Out of Scope

- Write-queue wiring and `queue_depth` accuracy; covered by `batch-operations`.
