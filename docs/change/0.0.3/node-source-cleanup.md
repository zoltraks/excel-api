# Node Source Cleanup

**Type**: Refactor

**Summary**

Reorganize the `excel-api-node` source tree for consistency and hygiene.
The change removes dead code, resolves stray root-level test files, normalizes file naming, and adds missing container and manifest hygiene.
No behavior changes.

## Description

A layout analysis of `excel-api-node` against the component-first Node service convention found the tree structurally sound but carrying hygiene defects.

The following should change:

- `src/errors/AppError.ts` is dead code with zero importers.
  The `errors/` directory dissolves with it.
- `src/server.test.ts` tests only `parseDuration` and duplicates `src/util/duration.test.ts`.
  Its unique invalid-format inputs move into `src/util/duration.test.ts` and the file is removed.
- `src/logging.test.ts` is an orphan test asserting a hardcoded literal instead of exercising code.
  It moves into `src/logger/` and is retargeted at the real request-log record builder in `rotatingFileLogger.ts`.
- `src/logger/index.ts` is the only `index.ts` in the tree and holds the implementation rather than a barrel export.
  It renames to a concern-named file and its one import site updates.
- No `.dockerignore` exists, so `node_modules`, `.git`, `dist`, tests, and local files enter every Docker build context.
- `package.json` lacks `private` and `engines` and carries a `main` field that belongs to libraries, not applications.
- The recorded conventions are stale: `docs/standard/ts-node-development.md` prescribes `index.ts` barrels and `PascalCase` class files that the code never adopted.
  The standard and the `src/` trees in `docs/ARCHITECTURE.md` and `docs/SPECIFICATION.md` update to describe the adopted convention.

## Out of Scope

- Splitting `server.ts` into an app builder and a process entry (explicitly excluded).
- Signal handling (`SIGTERM`) and graceful shutdown changes.
- New test coverage for `auth/jwt`, `auth/middleware`, `excel/*`, `logger/*`, or `routes/*`.
- Grouping `routes/` helpers or top-level `src/` folders.
- Any behavior change to runtime code.
