# API Field Renames and Timestamp Format

## Type

Feature

## Summary

Rename three JSON response fields - `timezone` to `zone`,
`modified_at` to `modified`, `size_bytes` to `size` - and adopt
`YYYY-MM-DD hh:mm:ss.fff` local server time (milliseconds, no zone
suffix) as the single timestamp format for every timestamp the API
produces, including cell date values and the on-disk lockfile
`locked_at`.

## Coverage

All four server implementations (Node, Java, C#, Rust), the Go CLI
client, the OpenAPI contract, the integration test suite, and the
guidelines documenting the convention.

## Description

The change is contract-visible and therefore lands in every
implementation simultaneously per the parity rule.

Fields renamed: `timezone` -> `zone`, `modified_at` -> `modified`,
`size_bytes` -> `size`.

Fields reformatted to `YYYY-MM-DD hh:mm:ss.fff` local server time:
- `time` (health)
- `modified` (workbook metadata, from file mtime)
- `applied_at` (write-operation responses)
- `locked_since` (lock-status response)
- `locked_at` (on-disk lockfile - dual-format parse keeps RFC3339
  fallback so a mixed-version lockfile still resolves staleness)
- Excel date-typed cell values

Unchanged: `uptime`, `expires_in`, numeric fields, log-line format,
`/metrics` text output.

## Hints

- Contract first: `docs/contract/openapi.yaml` renames + format
  strings, then `shell/sync.sh` propagates the copies.
- Per-implementation edit sites are enumerated in the implementation
  plan.
- Version stays 0.0.7 - no version files are touched.
