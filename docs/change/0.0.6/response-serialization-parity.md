# Response Serialization Parity

## Type

Feature

## Summary

Exact output parity requires three serialization behaviors to match
byte-for-byte: JSON key order, the pretty-print key/value separator, and
the error-envelope field order.

## Coverage

All four servers' JSON writers: `excel-api-node` (Fastify onSend/JSON),
`excel-api-java` (Jackson), `excel-api-csharp` (System.Text.Json),
`excel-api-rust` (serde_json). The contract is unchanged - this is
output-shape conformance.

## Description

Observed divergences from live instances on identical data:

- **Key order**: Node, Java, and C# emit fields in declaration order
  (`{"status","implementation","version","uptime","time","timezone"}`).
  Rust emits alphabetically sorted keys
  (`{"implementation","status","time","timezone","uptime","version"}`)
  because `serde_json::Map` defaults to `BTreeMap`. Enable serde's
  `preserve_order` feature (or insert in contract order) so Rust emits
  declaration order like the others.
- **Pretty separator**: with `server.json.pretty`, Jackson's default
  pretty printer emits `"key" : "value"` (space both sides) while
  Node/C#/Rust emit `"key": "value"`. Java needs a custom
  `DefaultPrettyPrinter` with the standard separator so pretty output is
  byte-identical.
- **Error-envelope order**: Java's auth entry point writes
  `{"message":"...","error":"..."}` while the contract example and the
  other three servers emit `{"error":"...","message":"..."}` - swap the
  insertion order in `WebSecurityConfiguration.writeError` (and check
  `AclAuthorizationFilter`'s `Map.of` usage, which has unspecified
  ordering anyway - build the envelope in `error`-then-`message` order
  everywhere).

Acceptance: `curl` responses diff byte-identical across the four servers
for `/health`, every success payload, and every error envelope, in both
compact and `json.pretty` modes.

## Out of Scope

- Which fields exist - names/statuses are already governed by the
  contract.
- The Java `/error` masking bug (`java-sheets-error-responses`).

## Verification

Implemented during the 0.0.6 autonomous SDLC run. Evidence: per-component build/typecheck/lint/unit-test loops clean (Node type-check+lint+test+build, Java compile+checkstyle+test+package, C# build+format+29 tests, Rust fmt+clippy+13 tests+release, Go build+fmt+vet+test); black-box Jest suite run natively against each server - Node 26/26, Java 26/26, C# 26/26, Rust 26/26; `/health` and `/openapi.yaml` report the contract-sourced version; error envelope key order verified `error`-then-`message`; `/auth/token` accepts form-urlencoded and JSON on all four.
