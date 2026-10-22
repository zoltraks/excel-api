# Node Source Cleanup - Implementation Plan

**Change Request Reference**: `docs/change/0.0.3/node-source-cleanup.md`

## Best Practices

- `docs/standard/ts-node-development.md` — TypeScript/Node.js implementation standard.
- Component-first Node service layout: one file per concern, colocated `*.test.ts` named after sources, no lone `index.ts`, direct imports.

## Documentation Updates

Update before any code change:

- `docs/standard/ts-node-development.md` — replace the `index.ts` barrel rule with the adopted direct-import convention and the `PascalCase.ts` class-file rule with uniform `camelCase`.
- `docs/ARCHITECTURE.md` — remove the `errors/` line from the `excel-api-node/` tree.
- `docs/SPECIFICATION.md` — remove the `errors/` line from the `excel-api-node/` tree.

`docs/PROJECT.md` and `docs/contract/openapi.yaml` are unaffected.

## Step by Step Implementation

**Fold the duplicate duration test**

Files: `src/util/duration.test.ts`, `src/server.test.ts`.

Add the invalid inputs unique to `server.test.ts` (`'s'`, `'13x'`, `'3d'`) to the throws case in `src/util/duration.test.ts`, then delete `src/server.test.ts`.

**Retarget the orphan logging test**

Files: `src/logging.test.ts` to `src/logger/rotatingFileLogger.test.ts`.

Move the file with `git mv` and rewrite it to call `buildRequestLogRecord` with minimal request and reply stubs.
Keep the same assertions on the record shape: `level`, `date`, `time`, `message`, `request`, `response`, `remote` present and `msg` absent.

**Remove the dead errors module**

Files: `src/errors/AppError.ts`, the `src/errors/` directory.

Delete with `git rm` and remove the now-empty directory.

**Rename the logger module file**

Files: `src/logger/index.ts` to `src/logger/jsonLogger.ts`, `src/server.ts`.

Move with `git mv` and update the single import in `src/server.ts` from `./logger/index.js` to `./logger/jsonLogger.js`.

**Add container ignore rules**

File: `.dockerignore` (new).

Exclude `node_modules`, `dist`, `coverage`, `.git`, `config/`, `*.log`, `.env*`, `**/*.test.ts`, and `.DS_Store` from the build context.

**Harden the package manifest**

File: `package.json`.

Add `"private": true`, add `"engines": { "node": ">=22" }` matching the pinned `node:22-alpine` image, and remove the `main` field.
Scripts and dependency lists stay unchanged.

## Testing Strategy

- Existing unit tests must pass unchanged except the retargeted logging test and the folded duration cases.
- The retargeted `rotatingFileLogger.test.ts` exercises `buildRequestLogRecord` and keeps the original field-shape assertions.
- `npm run type-check` catches any import left pointing at `logger/index.js` or the deleted `errors/` module.

## Verification

Run the verification loop in `docs/TESTING.md` for `excel-api-node`: typecheck, lint and format, unit tests, production build.
A clean baseline runs before the first file move (`npm ci` first — `node_modules` was removed).
The change touches no authentication, file-handling, dependency, or network-facing code, so the security gate reduces to a clean `npm audit`.
