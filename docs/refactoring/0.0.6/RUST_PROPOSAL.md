# Refactoring Proposal - Rust

## Scope

`excel-api-rust` - serialization order and token-body parsing.

## Target Refactoring

1. **Ordered JSON output.** `serde_json` now uses `preserve_order` so emitted maps keep declaration order like the other servers.

2. **Content-type-tolerant token endpoint.** The `Form` extractor (which rejected JSON bodies with 400) was replaced by a header-aware body parse accepting both form-urlencoded and JSON, matching the lenient superset documented in SPECIFICATION.md.
