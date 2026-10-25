# C# Value Typing and Error Mapping Parity

## Type

Bug

## Summary

`excel-api-csharp` returns numeric cell values as strings after record
writes, and returns `400` instead of `404` for an unknown sheet.
3 of 26 integration tests fail against a live instance.

## Coverage

`excel-api-csharp` only. The contract, test suite, and other servers are
unchanged.

## Description

Verified against a live instance on the shared test fixtures:

- **Numeric typing loss**: posting a record with `{"ID": 9501}` and
  reading it back yields `"9501"` (string) in `data`, while Node/Rust
  return `9501` (number). The same type loss makes the concurrency test
  fail: `data['ID']` is a string so `ids.has(9500 + i)` is false for all
  eight written rows. ClosedXML cell values are being read or written as
  text instead of preserving the numeric type.
- **Wrong status for unknown sheet**: `GET
  /workbooks/simple/sheets/NoSuchSheet` returns `400` where the contract
  and other servers return `404 SHEET_NOT_FOUND`.

Observed evidence: Jest suite failures -
`rows.test.ts` (`Expected: 9001, Received: "9001"`),
`sheets.test.ts` (`Expected: 404, Received: 400`),
`concurrency.test.ts` (`ids.has(9500 + i)` false for all writes).

Acceptance: numeric values written through record/cell operations read
back as JSON numbers in `native`/`display`/`string` formats per the
contract; unknown sheets return `404 SHEET_NOT_FOUND`; the integration
suite passes 26/26 against the C# instance.

## Out of Scope

- Metrics surface gaps (covered by `metrics-surface-parity`).
- Config profiles support (covered by `config-surface-parity`).
- Changes to the other three implementations.

## Verification

Implemented during the 0.0.6 autonomous SDLC run. Evidence: per-component build/typecheck/lint/unit-test loops clean (Node type-check+lint+test+build, Java compile+checkstyle+test+package, C# build+format+29 tests, Rust fmt+clippy+13 tests+release, Go build+fmt+vet+test); black-box Jest suite run natively against each server - Node 26/26, Java 26/26, C# 26/26, Rust 26/26; `/health` and `/openapi.yaml` report the contract-sourced version; error envelope key order verified `error`-then-`message`; `/auth/token` accepts form-urlencoded and JSON on all four.
