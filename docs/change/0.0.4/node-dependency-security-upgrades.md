# Node Dependency Security Upgrades

## Type

Chore

## Summary

`npm audit` still reports vulnerabilities in `excel-api-node` that only
breaking upgrades resolve - `zod` 3 to 4 and the `exceljs`/`uuid` chain.
Apply the majors with the code adaptations they require.

## Coverage

Single implementation: `excel-api-node` - the dependency set is
implementation-owned, so the narrower scope is named explicitly. Contract and
other servers are unaffected.

## Description

Found during the 0.0.3 autonomous SDLC security gate. After `npm audit fix`
applied the non-breaking set, 7 vulnerabilities remain (2 moderate, 4 high, 1
critical) requiring majors:

- `zod` < 4.6.6 - memory-exhaustion advisory; upgrade to zod 4 and adapt
  validation call sites (error surface and message APIs changed across the
  major).
- `uuid` < 11.1.1 via `exceljs` - buffer bounds advisory; the audit path
  wants `exceljs@3.4.0`, a downgrade - instead upgrade `uuid` to 11.x and
  verify `exceljs` resolves it cleanly or pin an override.

Requirements:

- Residual `npm audit` findings drop to zero or to a documented, reasoned
  remainder.
- `npm run build`, `npm run lint`, `npm test -- --run` stay green after the
  upgrades.
- Config-validation behavior stays contract-identical - the zod migration
  must not change accepted config shapes or error responses.

## Out of Scope

- Adding new dependencies or features.
- Non-breaking upgrades already applied in the 0.0.3 window.
