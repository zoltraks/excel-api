# Refactoring Assessment - Rust

## Scope

`excel-api-rust` - serialization order and token-body parsing.

## Outcome

1. **Ordered JSON output.** `serde_json` now uses `preserve_order` so emitted maps keep declaration order like the other servers.

2. **Content-type-tolerant token endpoint.** The `Form` extractor (which rejected JSON bodies with 400) was replaced by a header-aware body parse accepting both form-urlencoded and JSON, matching the lenient superset documented in SPECIFICATION.md.

Executed as part of the 0.0.6 change window; verification evidence lives in the change-request notes and the final gate run.
