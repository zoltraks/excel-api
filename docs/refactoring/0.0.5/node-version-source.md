# Refactoring Proposal - excel-api-node version source

**Change window**: 0.0.5
**Component**: excel-api-node
**Type**: Maintainability / correctness

## Problem

`/health` and `/openapi.{yaml,json}` responses carried a hardcoded
`version: '0.0.3'` literal while `package.json` already read `0.0.5` - a
stale, drifted value that required manual updates every release and had
already been missed in two version bumps.

## Proposal

Introduce a single `PACKAGE_VERSION` export resolved from
`package.json` via `createRequire` (works identically from `src/` under
tsx and from `dist/` under node, at the same relative depth) and consume
it in `routes/health.ts` and `routes/openapi.ts`.

## Risk

Low. Read-only accessor, no behavior change beyond the reported value;
the contract fields stay identical in shape.

## Assessment - executed

- Added `src/version.ts` exporting `PACKAGE_VERSION`.
- `routes/health.ts` and `routes/openapi.ts` now serve the real package
  version (`0.0.5` today), eliminating the stale literal and one manual
  sync point from `docs/VERSIONING.md`.
- Verified: `npm run type-check`, `npm run lint`, `npm run format`,
  `npm test -- --run` (123 tests) all clean; the value reported by
  `/health` is now consistent with `package.json` and the contract.
