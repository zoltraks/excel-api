# Metrics Surface Parity

## Type

Feature

## Summary

The four servers expose divergent `/metrics` families. Define the
canonical set and bring every implementation to it.

## Coverage

All four servers (`excel-api-node`, `excel-api-java`, `excel-api-csharp`,
`excel-api-rust`) and the observability documentation. The contract is
unchanged - `/metrics` is an implementation surface documented in
`docs/ARCHITECTURE.md`/`docs/PROJECT.md`.

## Description

Live exposition captured from each implementation:

| Family | Node | Java | C# | Rust |
| --- | --- | --- | --- | --- |
| `excel_api_uptime_seconds`, `excel_api_implementation_info` | yes | yes | yes | yes |
| `excel_api_http_requests_total`, `excel_api_http_request_duration_ms` | yes | absent from exposition | yes | yes |
| Per-endpoint `excel_api_<endpoint>_requests_total` | yes | no | no | yes |
| Per-endpoint `excel_api_<endpoint>_duration_ms` histogram | yes | no | no | **no** |
| `excel_api_errors_total` | yes | no | no | yes |
| `excel_api_queue_depth` | no | no | no | yes |

Gaps to close:

- **Java**: exposes only `uptime_seconds` and `implementation_info` even
  after traffic - `MetricsFilter` records HTTP counters/durations but
  they never reach the `/metrics` servlet output; per-endpoint families
  and `errors_total` are absent entirely.
- **C#**: exposes only the four base metrics - no per-endpoint families,
  no `errors_total`, no `queue_depth`.
- **Rust**: per-endpoint request counters exist but no
  `*_duration_ms{,_bucket,_count,_sum}` histograms; add them to match the
  Node shape.
- **Node**: add `excel_api_queue_depth` (gauge, per workbook) - Rust
  already exposes it and it is the queue's most useful signal.

The canonical set is the union: base metrics + HTTP aggregate +
per-endpoint `*_requests_total` and `*_duration_ms` histograms +
`errors_total` + `queue_depth`, documented in
`docs/ARCHITECTURE.md`.

Acceptance: identical family sets (modulo implementation label) on all
four `/metrics` endpoints after identical traffic; docs updated.

## Out of Scope

- Changing metric *names* or label sets already emitted.
- The Java sheets/error bugs (`java-sheets-error-responses`).
