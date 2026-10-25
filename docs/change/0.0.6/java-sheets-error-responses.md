# Java Sheets Endpoints and Error Response Parity

## Type

Bug

## Summary

`excel-api-java` returns `401 UNAUTHORIZED` for every request under
`/workbooks/{id}/sheets/**` and for every unmapped path, hiding the real
failures. 13 of 26 integration tests fail against a live instance.

## Coverage

`excel-api-java` only. The contract, test suite, and other servers are
unchanged.

## Description

Two layered defects, verified against a live instance:

- **Sheet routes throw and are masked**: every authenticated request to
  `/workbooks/{id}/sheets/{name}` (and `/columns`, `/records`, `/cells`,
  `/ranges`, `/operations`, `/lock-status`-adjacent sheet paths) throws an
  exception inside the handler path. Likely candidates: `WorkbookEntry`
  `sheets` map being `null` for workbooks without a `sheets:` config
  block (NPE in `SheetController#getSheet`) or a sheet-config binding
  mismatch (`identifier_row` etc. snake_case keys not mapping onto the
  bound object).
- **Error dispatch masks real statuses**: the thrown exception dispatches
  to `/error`, where Spring Security re-secures the request with an
  anonymous context; `anyRequest().authenticated()` rejects it via the
  entry point, so every unhandled exception or unmapped path surfaces as
  `401 {"error":"UNAUTHORIZED","message":"Authentication required"}`
  instead of the true status (`404`, `400`, `500`). A bogus path
  (`/bogus/path`) also returns 401 instead of 404.

Observed evidence: `GET /workbooks/simple` -> `200`;
`GET /workbooks/simple/sheets/Sheet1` (existing sheet) -> `401`;
`GET /workbooks/multi-header/sheets/data` (configured sheet) -> `401`;
`GET /workbooks/nonexistent` -> `404 WORKBOOK_NOT_FOUND` (correct);
`GET /bogus/path` -> `401`. Jest suite: 13 of 26 tests fail.

Acceptance: all `/sheets/**` contract paths serve per Node/Rust behavior;
domain errors keep their mapped statuses (`404 SHEET_NOT_FOUND`,
`400 SHEET_NOT_CONFIGURED`, `404 WORKBOOK_NOT_FOUND`, `404 ROW_NOT_FOUND`);
unmapped paths return `404`; the `/error` dispatch must not convert
unhandled exceptions into `401` (permit error dispatch or register an
exception mapper before authorization denies it); the integration suite
passes 26/26 against the Java instance.

## Out of Scope

- Metrics surface gaps (covered by `metrics-surface-parity`).
- Config surface gaps (covered by `config-surface-parity`).
- Changes to the other three implementations.

## Verification

Implemented during the 0.0.6 autonomous SDLC run. Evidence: per-component build/typecheck/lint/unit-test loops clean (Node type-check+lint+test+build, Java compile+checkstyle+test+package, C# build+format+29 tests, Rust fmt+clippy+13 tests+release, Go build+fmt+vet+test); black-box Jest suite run natively against each server - Node 26/26, Java 26/26, C# 26/26, Rust 26/26; `/health` and `/openapi.yaml` report the contract-sourced version; error envelope key order verified `error`-then-`message`; `/auth/token` accepts form-urlencoded and JSON on all four.
