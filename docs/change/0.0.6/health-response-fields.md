# Health Response Field Renames

## Type

Feature (breaking contract change)

## Summary

Rename two `/health` response fields in the contract and every
implementation: `uptime_seconds` -> `uptime` (integer seconds) and
`server_time` -> `time` (local time formatted `YYYY-MM-DD hh:mm:ss.fff`).

## Coverage

`docs/contract/openapi.yaml` (`HealthResponse` schema and required list),
all four servers (`excel-api-node`, `excel-api-java`, `excel-api-csharp`,
`excel-api-rust`), synced `resources/openapi.yaml` copies, and the prose
references in `docs/PROJECT.md` / `docs/ARCHITECTURE.md` /
`docs/SPECIFICATION.md`.

## Description

Current shape (all four implementations):

```json
{"status":"ok","implementation":"excel-api-x","version":"0.0.6",
 "uptime_seconds":12,"server_time":"2026-10-25T08:41:23.470Z",
 "timezone":"Europe/Berlin"}
```

Target shape:

```json
{"status":"ok","implementation":"excel-api-x","version":"0.0.6",
 "uptime":12,"time":"2026-10-25 08:41:23.470","timezone":"Europe/Berlin"}
```

Semantics:

- `uptime` - whole seconds since process start as a JSON integer (no
  fractional part, no unit suffix in the name).
- `time` - the server's current LOCAL date and time formatted
  `YYYY-MM-DD hh:mm:ss.fff` (24-hour clock, space separator, millisecond
  precision, no timezone suffix). `timezone` keeps reporting the zone
  name, so the pair is unambiguous.

Every implementation renders `time` in its own local timezone -
identical format, per-host value.

## Out of Scope

- Clients that consume `/health` (the Go CLI reads only `status` for its
  ping verb - verify during implementation).
- Any other `/health` fields or other endpoints.
- Version bump - handled by the release routine, not this change.
