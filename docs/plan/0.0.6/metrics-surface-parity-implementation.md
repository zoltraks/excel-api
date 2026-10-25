# Implementation Plan - Metrics Surface Parity

## Change Request Reference

`docs/change/0.0.6/metrics-surface-parity.md`

## Best Practices

- `docs/standard/typescript-fastify-development.md`
- `docs/standard/java-spring-development.md`
- `docs/standard/csharp-aspnet-development.md`
- `docs/standard/rust-api-development.md`

## Documentation Updates

- `docs/ARCHITECTURE.md` - canonical metric family set
- `docs/PROJECT.md` - metrics section if the surface description changes

## Step by Step Implementation

**Canonical set.** Document in `docs/ARCHITECTURE.md`: `excel_api_uptime_seconds`, `excel_api_implementation_info`, `excel_api_http_requests_total`, `excel_api_http_request_duration_ms`, per-endpoint `excel_api_<endpoint>_requests_total` and `excel_api_<endpoint>_duration_ms` histograms, `excel_api_errors_total`, `excel_api_queue_depth`.

**Java.** Fix `MetricsFilter`-to-exposition wiring; add per-endpoint families, `errors_total`, `queue_depth`.

**C#.** Add per-endpoint families, `errors_total`, `queue_depth`.

**Rust.** Add per-endpoint `*_duration_ms` histograms.

**Node.** Add the `queue_depth` gauge per workbook.

## Testing Strategy

- Unit: exposition contains every family after synthetic traffic.
- Manual: identical traffic produces identical family sets (modulo implementation label) on all four `/metrics` endpoints.

## Verification

Per `docs/TESTING.md` loops on all four servers.
