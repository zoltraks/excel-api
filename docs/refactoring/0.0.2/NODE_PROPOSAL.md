# Node.js Refactoring Proposal

## Problem

The Node.js implementation has a monolithic entry point that violates the project structure defined in `docs/standard/ts-node-development.md`.

- `excel-api-node/src/server.ts` is 32 KB and ~1000 lines long. It contains CLI parsing, duration parsing, Fastify bootstrap, all route handlers, error mapping, and lifecycle management in a single file.
- All HTTP route handlers (`/health`, `/metrics`, `/workbooks`, `/workbooks/{id}/sheets/...`, cells, records, batch operations, lock-status, openapi) live inline in `server.ts` starting at line 236.
- The directories `src/routes/` and `src/services/` exist but are empty, indicating the intended layered structure was never populated.
- CLI argument parsing (`parseArgs`) and duration parsing (`parseDuration`) are duplicated between `server.ts` and `src/config/loader.ts`.
- Error-to-HTTP-status mapping logic is scattered inline across handlers rather than centralized.
- The file violates the single-responsibility principle and the "keep files small, one concern per file" guidance in the Node.js standard.

## Goal

A layered structure mirroring the Java and C# implementations:

- `src/server.ts` — application bootstrap only (argument parsing delegate, Fastify creation, plugin registration, route registration, lifecycle wiring, `listen`). Target size: under 150 lines.
- `src/routes/` — one file per resource group: `health.ts`, `metrics.ts`, `openapi.ts`, `workbooks.ts`, `sheets.ts`, `cells.ts`, `records.ts`, `operations.ts`, `lockStatus.ts`, `auth.ts`.
- `src/services/` — business logic extracted from route handlers: `workbookService.ts`, `sheetService.ts`, `cellService.ts`, `recordService.ts`.
- `src/errors/` — `AppError` class hierarchy and centralized `errorHandler.ts` mapping errors to the project error envelope.
- `src/cli/args.ts` — CLI argument parsing with types, shared between `server.ts` and tests.
- `src/util/duration.ts` — canonical duration parser, used by `server.ts`, `config/loader.ts`, and future callers.

Each route file exports a Fastify plugin that registers its handlers. `server.ts` imports and registers each plugin.

## Plan

**Step 1**

Extract `parseDuration` from `server.ts` into `src/util/duration.ts` with a unit test file `duration.test.ts`. Update `server.ts` and `config/loader.ts` to import from the new module. Run build, lint, and tests.

**Step 2**

Extract `parseArgs` from `server.ts` into `src/cli/args.ts` with typed return type and a unit test file. Update `server.ts` to import. Run build, lint, and tests.

**Step 3**

Create `src/errors/AppError.ts` defining the error class hierarchy (`AppError`, `NotFoundError`, `ValidationError`, `AuthError`, `LockError`, `ReadonlyError`, `ServiceBusyError`). Create `src/errors/errorHandler.ts` with a Fastify `setErrorHandler` that maps each error type to the project error envelope. Register the handler in `server.ts`. Do not change handler logic yet.

**Step 4**

Extract service routes one at a time, in this order: health, metrics, openapi, auth, workbooks, sheets, columns, records, cells, batch operations, lock-status. For each route:

- Create `src/routes/<name>.ts` exporting a Fastify plugin.
- Move handler code verbatim from `server.ts` into the plugin, replacing inline error mapping with `throw new AppError(...)` using the new error classes.
- Register the plugin in `server.ts`.
- Run build, lint, and tests after each route extraction.

**Step 5**

Introduce service layer. For each resource (workbook, sheet, cell, record), create `src/services/<resource>Service.ts` and move business logic out of the route handler. Route handlers become thin: parse parameters, call service, return result.

**Step 6**

Delete unused code paths from `server.ts`. Confirm `server.ts` is under 150 lines.

**Step 7**

Re-run full build, lint, all unit tests, runtime verification with `--life 60s` and the Go CLI.

## Risk

- **Route extraction breaking request context**: Fastify route options (schemas, preHandlers) must be preserved exactly when moving handlers into plugins. Missing a `preHandler` on the auth middleware would expose a protected endpoint.
- **Error envelope drift**: Centralized error handler must reproduce the current envelope exactly to avoid breaking integration tests.
- **Test coverage**: Existing tests (`config/loader.test.ts`, `workbook/registry.test.ts`, etc.) cover the lower layers but `server.test.ts` covers only 4 cases. Refactoring routes should add per-route integration tests using Fastify's `inject` API.
- **Circular dependencies**: The service layer must not import from routes. Keep dependency direction strictly `routes → services → lower layers`.

## Acceptance Criteria

- `src/server.ts` is under 150 lines and contains only bootstrap code.
- Every HTTP endpoint lives in a file under `src/routes/`.
- Every route handler delegates business logic to a function in `src/services/`.
- `parseArgs` and `parseDuration` are imported from shared modules; no duplication remains.
- Centralized error handler maps all `AppError` subclasses to the project error envelope.
- `npm run build` produces no errors.
- `npm run lint` produces no warnings.
- `npm test -- --run` passes all tests including new per-route integration tests.
- Runtime verification with `--life 60s` and Go CLI listing workbooks succeeds.
- Integration tests in `excel-api-test/` pass against the refactored server.
