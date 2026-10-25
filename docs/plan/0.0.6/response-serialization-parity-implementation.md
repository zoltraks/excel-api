# Implementation Plan - Response Serialization Parity

## Change Request Reference

`docs/change/0.0.6/response-serialization-parity.md`

## Best Practices

- `docs/standard/java-spring-development.md`
- `docs/standard/rust-api-development.md`

## Documentation Updates

- `docs/SPECIFICATION.md` - serialization conformance notes

## Step by Step Implementation

**Rust key order.** Enable `serde_json`'s `preserve_order` feature in `Cargo.toml`; ensure `/health` and envelopes emit declaration order.

**Java pretty separator.** Register a custom `DefaultPrettyPrinter` with the `"key": "value"` separator under the `server.json.pretty` setting in `JacksonConfiguration`.

**Java envelope order.** Replace `Map.of` with insertion-ordered output (`LinkedHashMap` or a small record serialized `error` then `message`) in `WebSecurityConfiguration.writeError`, `AclAuthorizationFilter`'s forbidden writer, and `GlobalExceptionHandler`.

## Testing Strategy

- Manual byte-diff: `curl` `/health`, one success payload, one error envelope on all four servers, compact and `json.pretty` modes - output must be byte-identical apart from the implementation name and live values.

## Verification

Per `docs/TESTING.md` loops on `excel-api-java` and `excel-api-rust`.
