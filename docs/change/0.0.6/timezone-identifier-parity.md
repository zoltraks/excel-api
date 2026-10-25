# Timezone Identifier Parity

## Type

Feature

## Summary

`/health`'s `timezone` field reports different IANA names on the same
host - C# says `Europe/Oslo` while Node/Java/Rust say `Europe/Berlin`.
Define one canonical resolution so all four report the same identifier.

## Coverage

`excel-api-csharp` (`HealthEndpoints` timezone resolution) primarily;
verification across all four. `docs/SPECIFICATION.md` documents the
chosen rule.

## Description

Each stack resolves the local timezone ID differently: Node and Rust use
the host's IANA database entry (`Europe/Berlin`), Java uses
`ZoneId.systemDefault()` (`Europe/Berlin`), and C#'s
`TimeZoneInfo.Local` on macOS maps to `Europe/Oslo` (same UTC+1 offset,
different canonical ID - .NET picks its own preferred IANA node).

Observed live: C# `"timezone":"Europe/Oslo"`, others
`"timezone":"Europe/Berlin"` - same machine, same instant.

Approach options (pick in the plan):

1. Read `TZ`/system zone through a shared precedence and prefer the
   zone matching the `/etc/localtime` symlink target on Unix hosts.
2. Allow config/env override (`EXCEL_API_TIMEZONE` or config key) that
   all four honor identically.
3. Normalize via an offset-to-canonical-city table shared by all four.

Acceptance: all four `/health` responses carry the same `timezone`
string on the same host.

## Out of Scope

- The `time` field format (done under `health-response-fields`).
- Timezone *conversion* of cell data - this is the reported zone name
  only.
