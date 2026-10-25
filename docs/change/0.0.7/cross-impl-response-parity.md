# Cross-Implementation Response Parity

## Type

Fix

## Summary

A full operation-parity matrix (every contract endpoint, identical
requests, normalized body diff across all four servers on the shared
fixture) found contract violations and parity gaps. Align every
implementation on the contract's canonical shapes.

## Coverage

All four servers plus `docs/contract/openapi.yaml` where a convention
needs writing down.

## Description

Contract violations:

- Rust `WorkbookInfo` emits `sheet_names`; the contract field is
  `sheets`. Java `CellData` emits `formula`; the contract field is
  `is_formula`.
- `number_format` must be `null` when unset - C# emits `""`, Java
  emits `"General"`; node/rust already emit `null`.
- Node leaks Fastify's error envelope (`statusCode`, `code`,
  `error`, `message`) on schema-validation failures instead of the
  contract's `{error, message}`.
- Invalid cell refs return 500 (C# empty, node "A Cell needs a Row")
  or 200 (Java) instead of a 400 `VALIDATION_ERROR` (rust conforms).

Parity gaps (contract-tolerated, aligned for identical responses):

- `locked_by`/`locked_since` (contract-optional) emitted only by C#;
  emit on all four (`null` when unlocked).
- Empty-cell `value` is `""` on C#/Java, `null` on node/rust -
  canonical `null`.
- Numeric serialization `100` vs `100.0` - emit `100` (integral
  numbers serialize without a fraction).
- Metrics family coverage differs (C# `record_delete_*` /
  `range_get_duration_*` absent on some servers) - ship the canonical
  family set.
- Workbook list ordering differs (config order vs sorted) - canonical
  = registry/config order.
- `SHEET_NOT_FOUND` message text differs - canonical `Sheet '<name>'
  not found in workbook`.
- `columns` response: C# extras `source`/`description` - keep if the
  contract includes them, otherwise align all four to emit them.

## Hints

- `parity_test.py` (work/itest) diffs every endpoint; re-run to zero
  divergences after fixes.
- Registry ordering: rust iterates a HashMap; others keep config
  order.
- Optional contract fields may still be emitted uniformly for parity.
