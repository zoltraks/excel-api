# Implementation Plan - API Field Renames and Timestamp Format

## Change Request Reference

`docs/change/0.0.7/api-field-renames-time-format.md`

## Best Practices

- `docs/standard/typescript-fastify-development.md`
- `docs/standard/java-spring-development.md`
- `docs/standard/csharp-aspnet-development.md`
- `docs/standard/rust-api-development.md`
- `docs/standard/openapi-general-development.md`

## Documentation Updates

- `docs/contract/openapi.yaml` - field renames and timestamp format,
  propagated by `shell/sync.sh`
- `docs/GUIDELINES.md` - new API Conventions section
- `docs/PROJECT.md`, `docs/SPECIFICATION.md`,
  `docs/ARCHITECTURE.md` - renamed fields and format in prose and
  examples

## Step by Step Implementation

**Contract.** In `openapi.yaml`: rename `timezone` to `zone`,
`modified_at` to `modified`, `size_bytes` to `size`; change
`format: date-time` on `time`, `modified`, `applied_at`,
`locked_since` to `type: string` with pattern
`^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d{3}$` described as local
server time; update the HealthResponse required list. Run
`bash shell/sync.sh`.

**Guidelines.** Add an API Conventions section to `GUIDELINES.md`
covering the naming style, the timestamp format and its scope
(responses, lockfiles, cell dates), and the rule that contract-visible
changes are features for all four implementations.

**Node.** `routes/health.ts` `zone`; `routes/workbooks.ts` `modified`
(local mtime) + `size`; `routes/operations.ts` `applied_at` local;
`lock/lockfile.ts` local write + dual-format parse; cell `Date`
values to local format; shared format helper.

**Java.** `HealthController` `zone`; `WorkbookInfo` `@JsonProperty`
renames; `WorkbookController` formatter to local pattern;
`OperationsController` `applied_at`; `FileLockService` write/parse
local + ISO fallback; cell date serialization.

**C#.** `HealthEndpoints` `zone`; `WorkbookEndpoints` `modified` /
`size` + `LastWriteTime` local format; `CellEndpoints` `applied_at`;
`FileLockService` local write + dual parse; `ExcelService` DateTime
to local format.

**Rust.** `service.rs` `zone`; `workbooks.rs` `modified` / `size` +
local mtime; `lock.rs` local write + `NaiveDateTime`/RFC3339 parse;
`values.rs` serial dates to local format; `util.rs` helper.

**Go client.** `internal/client/types.go` json tags; `main.go`,
`repl.go` display keys.

**Test suite.** Update `excel-api-test` assertions for renamed
fields and the timestamp pattern.

## Testing Strategy

- Unit: per-component loops; update tests asserting old names/ISO.
- Live: four servers - identical response shapes on health,
  workbooks, lock-status, and a date cell; `cross_test.py` rerun.

## Verification

`docs/TESTING.md` per component, `bash shell/sync.sh` contract sync
check, `git diff --check`.
