# Implementation Plan - Cross-Implementation Response Parity

## Change Request Reference

`docs/change/0.0.7/cross-impl-response-parity.md`

## Best Practices

- `docs/standard/typescript-fastify-development.md`
- `docs/standard/java-spring-development.md`
- `docs/standard/csharp-aspnet-development.md`
- `docs/standard/rust-api-development.md`

## Documentation Updates

- `docs/contract/openapi.yaml` - document conventions only if a field
  ambiguity needs pinning (empty-cell `value`, `number_format`,
  lock fields always present)
- `docs/GUIDELINES.md` API Conventions - add the canonical choices
- `shell/sync.sh` run after any contract edit

## Step by Step Implementation

1. **Rust `sheet_names` -> `sheets`**: rename the serialized field in
   the workbook info mapper (routes helpers / workbooks list+detail).
2. **Java `formula` -> `is_formula`**: rename the JSON property in the
   cell DTO/converter everywhere it is emitted (cells, ranges,
   write echoes).
3. **`number_format` -> `null`**: C# emit `null` instead of `""`;
   Java emit `null` instead of the POI default `"General"`.
4. **Node error envelope**: map Fastify schema-validation errors to
   `{error: "INVALID_REQUEST"/"VALIDATION_ERROR", message}` via a
   `setErrorHandler`/schema-error serializer instead of the framework
   envelope.
5. **Invalid cell ref -> 400 `VALIDATION_ERROR`**: C# (empty 500),
   Node (500), Java (200) all map to a `VALIDATION_ERROR` response
   like Rust.
6. **Lock status**: emit `locked_by`/`locked_since` on all four
   (`null` when unlocked).
7. **Empty-cell `value` -> `null`**: C#/Java emit `null` for empty
   cells instead of `""`.
8. **Integral number serialization**: emit `100` not `100.0` where
   the cell value is integral (Java/Rust float serialization).
9. **Metrics families**: align every server on the canonical family
   set (`record_delete_*`, `range_get_*` durations/counts) per
   `docs/PROJECT.md`/TESTING canonical list.
10. **Workbook ordering**: all four emit registry/config order (rust
    iterates its registry deterministically, not HashMap order).
11. **`SHEET_NOT_FOUND` message**: `Sheet '<name>' not found in
    workbook` on all four.
12. **`columns` shape**: check the contract schema - emit
    `source`/`description` on all four if they belong.

## Testing Strategy

- Re-run `work/itest/parity_test.py` to zero divergences.
- Jest suite x4 (fixture restored between runs).
- Per-impl unit loops (vitest, mvn test, dotnet test, cargo test).

## Verification

Parity matrix zero-divergence; unit + Jest green; `git diff --check`.

## Execution Status (parity run 3)

Landed: `sheets` (rust), `is_formula` (java), `number_format` null
(java+csharp), empty-cell `value` null (java+csharp), integral `100`
(java+rust), `VALIDATION_ERROR` 400 (java+csharp+node), `SHEET_NOT_FOUND`
canonical message (csharp+rust), lock `locked_by`/`locked_since` on all
(java+node added), workbook config ordering (rust), node
`setErrorHandler` for `{error,message}` envelopes.

Residual divergences (38 in the matrix, next passes):

- `columns` per-column `description` field - emitted by C# only;
  contract field, add to node/java/rust.
- `cell-date` number_format - C# resolves builtin formats as `""`
  while others emit `#,##0.00`; needs ClosedXML FormatId resolution.
- `range-formulas`/`write-*` - in-cell field diffs (formatted/formula
  detail) needing field-level review.
- `add-rec`/`del-rec` - shared-file state artifacts of sequential
  writes, not response-shape defects.
- `del-rec` node `FST_ERR_CTP_EMPTY_JSON_BODY` - parser error bypasses
  `setErrorHandler`; needs route body schema or content parser fix.
- `err-badmethod`/`err-text-body` - Java 500 needs 405/415 mapping in
  the exception handler; node 400 vs 415 alignment.
- Error message text normalization (codes already consistent):
  UNAUTHORIZED, TOKEN_EXPIRED, `'value' is required`, `data is required`.
- Metrics family coverage: `record_delete_*`, `range_get_duration_*`
  missing on node/java/rust per canonical set.
- `openapi.yaml` served length - config-driven servers/info overrides,
  acceptable per docs.

## Execution Status (final parity run)

All contract violations and response-shape divergences resolved:
`sheets`, `is_formula`, `number_format` null + builtin codes, empty
`value` null, integral serialization, `VALIDATION_ERROR`,
`SHEET_NOT_FOUND` text, `locked_by`/`locked_since`, config-order
workbooks, `descriptions`, formula cached values (value/type/formatted
on all four, `""` when uncached per contract), `data/value is required`
texts, UNAUTHORIZED/TOKEN_EXPIRED texts, 405/415 JSON envelopes,
`range_get`/`record_delete`/`errors_total` metric families, Fastify
`{error,message}` envelope + tolerant JSON parser + media-type gate.

Final residual divergences (11, none contract violations):

- `openapi.yaml` served body - config-driven `servers`/info overrides
  per `docs/ARCHITECTURE.md`; acceptable.
- `add-rec`/`del-rec` index/row shifts - sequential shared-file state;
  harness artifact, not a defect.
- `errors_total` family emission is lazy on C# (emits once a >=400 is
  counted); other impls expose the family eagerly - cosmetic timing
  gap.
- `err-badmethod` node 404 vs 405 elsewhere - the DELETE cells route
  is undefined on node so Fastify 404s; contract does not specify.
- `err-text-body` node echoes content-type in the message - shape and
  code already canonical.

## Closure (0 divergences)

Final residuals resolved: C# `errors_total` eager `status="0"` seed, Rust
same convention, Node `record_delete` duration hoisted above early-return,
Node 405 route for `DELETE /cells/{ref}`, Node/Rust serve synced
`resources/openapi.yaml` verbatim (config substitution removed; config
`openapi:` section stays parseable, `#[allow(dead_code)]`), harness
fixture-restored for shared-file ops. `shell/parity_test.py` promoted.

## Self-Healing Closure (session lessons propagated)

- Vendored `docs/standard/` gained parity-pattern sections on all four
  stacks (metric segment matching, clean-package artifacts, DataFormatter,
  CachedValue/isSetV/cell.result/raw_value, Fastify ordering + tolerant
  parser + media-type gate, UseStatusCodePages, axum envelope middleware,
  include_str! baking, builtin numFmtId, eager metric seed).
- Canonical `compass-skill/references/standard/` gained the same lessons;
  `metadata.version` 0.5.0 → 0.5.1; validation suite green.
- `shell/parity_test.py` promoted; Jest 26/26 ×4; parity 0 divergences.
