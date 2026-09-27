# Request Validation

**Type**: Fix

**Summary**: Request bodies are dereferenced without validation in all three servers — malformed input produces 500s instead of `400 INVALID_REQUEST`. Validate bodies against the contract schemas at the API boundary.

**Description**:

Audit finding FND-CQY-004 / recommendation REC-021.

- Node: schema-validate write request bodies (`CellWriteRequest`, `AddRecordRequest`, `UpdateRecordRequest`, batch requests) via Fastify JSON schema or zod at the route boundary.
- Java: explicit validation or Bean Validation on controller inputs — no unchecked casts of `request.get("data")`.
- C#: model binding guards validating required fields and types before use.
- Missing, mistyped, or malformed `value`/`data`/`operations` must return `400` with `INVALID_REQUEST` in the contract error envelope.
- Valid requests must be unaffected.

## Out of Scope

- Response-side validation harness (covered implicitly by `response-schema-parity` verification).
