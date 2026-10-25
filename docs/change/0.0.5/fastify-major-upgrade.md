# Fastify Major Upgrade

## Type

Chore

## Summary

`excel-api-node` pins Fastify 4, which keeps `find-my-way` on the vulnerable
8.x line and leaves Fastify advisories that only the 5.x release resolves.
Upgrade to Fastify 5, which requires raising the Node floor from 18 to 20.

## Coverage

Single implementation: `excel-api-node` - the framework and the engine
requirement are implementation-owned, so the narrower scope is named
explicitly. The `excel-api-test` suite verifies the server stays
contract-identical.

## Description

Deferred from the 0.0.4 dependency-security window: after all non-breaking
remediations, 2 high-severity findings remain (`find-my-way` <= 9.6.0 through
`fastify@4.29.x`, plus its Fastify advisory chain). No 8.x fix exists for
`find-my-way`, and Fastify 5 drops Node 18.

Requirements:

- Upgrade `fastify` to 5.x; adapt plugin registration, error handlers, and
  serializer setup to the 5.x API.
- Raise the documented Node floor to 20+ in `README.md`,
  `docs/SPECIFICATION.md`, the engineering standard, and `package.json`
  engines if present.
- `npm audit --omit=dev` reports no `find-my-way`/Fastify-chain findings.
- `npm run build`, `npm run lint`, `npm test -- --run` stay green; the
  integration suite verifies contract parity is preserved.
- The `overrides` entries (`uuid`, `tar`) are re-evaluated and removed when
  the upstream resolves natively.

## Out of Scope

- HTTP behavior or endpoint changes - the migration must be
  contract-identical.
- Other implementations (Java, C#, Go unaffected).
