# Fastify Major Upgrade Implementation Plan

## Change Request Reference

`docs/change/0.0.5/fastify-major-upgrade.md`

## Best Practices

- `docs/standard/typescript-fastify-development.md` - Node.js/TypeScript engineering standard.
- `docs/standard/openapi-general-development.md` - contract surface stays identical.

## Documentation Updates

- `docs/SPECIFICATION.md` - record Fastify 5 in the Node stack line.
- `excel-api-node/README.md` - raise the documented Node floor from `Node.js 18+` to `Node.js 22+` to match `engines` and the Dockerfile.
- `docs/PROJECT.md` and `docs/ARCHITECTURE.md` - no changes; the contract is untouched.

## Step by Step Implementation

**Documentation first**

Update `docs/SPECIFICATION.md` and `excel-api-node/README.md` before any dependency change.

**Dependency bump**

Edit `excel-api-node/package.json`: `fastify` `^4.29.1` to `^5.12.7`, `@fastify/cors` `^9.0.0` to `^11.3.1`.
Run `npm install` and let `package-lock.json` regenerate.

**Overrides re-evaluation**

Run `npm ls uuid tar` and `npm audit`.
Remove each `overrides` entry whose upstream now resolves natively.
Keep only entries still required, and record the decision in this plan's review notes.

**Source adaptation**

Compile with `npm run type-check`.
Adapt any Fastify 4-only API usage the compiler or ESLint flags.
Current usage review (`server.ts`, route plugins, `auth/middleware.ts`) shows only stable surfaces: `addHook`, `register`, `preHandler`, `addContentTypeParser`, `reply.status`, `reply.header`, `reply.elapsedTime`, `listen`.
Expected edits are minimal or none.

**Verification**

Run the verification loop for `excel-api-node` until clean.

## Testing Strategy

- `npm test -- --run` - existing Vitest suite must pass unchanged; the migration is contract-identical.
- `npm run type-check`, `npm run lint`, `npm run format` - zero errors and warnings.
- `npm audit` - no `find-my-way`/Fastify-chain findings remain.
- `IMAGE=excel-api-node docker compose -f docker-compose.test.yaml up --abort-on-container-exit` - integration suite verifies contract parity (when Docker is available).

## Verification

Verification loop and security checks per `docs/TESTING.md`.
The dependency-analysis check (`npm audit`) is mandatory for this change.

## Review Notes

- Resolved: `fastify` 5.12.7, `@fastify/cors` 11.3.1, `find-my-way` 9.10.0 - the vulnerable 8.x chain is gone.
- `npm audit --omit=dev` reports zero findings.
- Both `overrides` kept: `exceljs` still requires `uuid@^8.3.0` and `@mapbox/node-pre-gyp` still requires `tar@^6.1.11`, so neither upstream resolves natively.
- No source edits were needed - the used Fastify surface is 5.x-compatible; typecheck and lint pass unchanged.
- Remaining audit findings are dev-toolchain only (`vitest`/`vite`/`esbuild`/`tinypool`), a pre-existing condition unrelated to this change; remediation needs a breaking `vitest` major upgrade tracked separately.
