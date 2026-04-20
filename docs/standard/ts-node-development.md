# Node.js/TypeScript Engineering Standards

## Scope

This document defines TypeScript development standards for the Excel API Node implementation.
It covers language version, project structure, coding conventions, build system, testing, and tooling.

All paths below are relative to the `excel-api-node/` directory unless stated otherwise.

## Documentation

**TypeScript**

- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html) — official reference
- [TypeScript tsconfig reference](https://www.typescriptlang.org/tsconfig) — compiler options

**Node.js**

- [Node.js API Reference](https://nodejs.org/api/) — official documentation

**Key Libraries**

- [ExcelJS](https://github.com/exceljs/exceljs) — Excel file read/write
- [Fastify](https://fastify.dev/) — HTTP framework
- [zod](https://zod.dev) — schema validation for configuration
- [yaml](https://eemeli.org/yaml/) — YAML parsing
- [jsonwebtoken](https://github.com/auth0/node-jsonwebtoken) — JWT signing and verification
- [tsx](https://github.com/privatenumber/tsx) — TypeScript execution for development

## Core Technologies

* **Node.js 22 LTS**: Runtime platform. Use the LTS release for production services.
* **TypeScript 5.x** (strict mode): Required for all source files. No JavaScript source files in `src/`.
* **Fastify**: HTTP framework. Preferred over Express for performance and schema validation.
* **ExcelJS 4.x**: Excel file operations. Read-modify-write with style preservation.
* **Jest**: Unit and integration testing framework. Use `ts-jest` for TypeScript support.
* **ESLint** with `@typescript-eslint`: Linting enforced via project config.
* **Prettier**: Code formatting. Single source of truth for style.
* **Docker**: Containerization with multi-stage builds. Final image based on `node:22-alpine`.
* **tsx**: TypeScript execution for local development. Replaces `ts-node`.
* **zod**: Schema validation for configuration loading.

Dependencies are added only when the need is concrete and the alternative is significantly more complex.

## Project Structure

```text
src/
  server.ts           # Entry point
  config/             # Config and access.yaml loading, validation (zod schemas)
  auth/               # OAuth2 token endpoint, JWT, static token middleware
  routes/             # Fastify route handlers (workbooks, sheets, records, cells)
  services/           # Business logic (workbook registry, sheet metadata, formatting)
  queue/              # Write queue with Promise-chain serialization per workbook
  excel/              # ExcelJS wrapper (read, write, style copy, cache, locking)

resources/
  openapi.yaml        # Contract copy, loaded at startup

config/
  config.example.yaml # Example configuration
  access.example.yaml # Example sensitive configuration

test/
  unit/               # Unit tests mirroring src/ structure
  integration/        # Local integration tests with mocked Excel files
  fixture/            # Test data files
```

Each directory under `src/` contains a single module or functional area.
Module boundaries are enforced: cross-module imports go through `index.ts` barrel exports.
No circular dependencies between modules.

**File Naming Conventions**

* **`PascalCase.ts`**: Classes defined as the primary export — `ConfigLoader.ts`, `ExcelService.ts`
* **`camelCase.ts`**: Modules, utilities — `authMiddleware.ts`, `lockManager.ts`
* **`index.ts`**: Barrel export file for each module directory
* **`camelCase.test.ts`**: Test files mirror source path

**Version Control Exclusions**

Maintain a `.gitignore` file at project root to exclude: `node_modules/`, `dist/`, `.env*`, `logs/`, `coverage/`, IDE files, OS files.

## Naming Conventions

**Code Conventions**

* **Classes**: `PascalCase` — `ConfigLoader`, `WriteQueue`, `ExcelService`.
* **Interfaces**: `PascalCase`, no `I` prefix — `WorkbookConfig`, `WriteOperation`, `BatchResult`.
* **Type aliases**: `PascalCase` — `LogLevel`, `OperationType`, `CellRef`.
* **Enums and const objects**: `PascalCase` for the object, `UPPER_SNAKE_CASE` for values.
* **Functions and methods**: `camelCase` — `loadConfig()`, `enqueueWrite()`, `acquireLock()`.
* **Variables**: `camelCase` — `currentBatch`, `lockTimeout`, `workbookCache`.
* **Constants**: `UPPER_SNAKE_CASE` — `DEFAULT_BATCH_SIZE`, `MAX_QUEUE_DEPTH`, `LOCK_POLL_INTERVAL`.

**Configuration File Conventions**

* **YAML keys**: `snake_case` — `batch_max_size`, `lock_timeout_ms`, `client_secret`.
* **TypeScript interfaces**: `camelCase` — `batchMaxSize`, `lockTimeoutMs`, `clientSecret`.
* **Mapping**: Configuration loader maps `snake_case` from YAML to `camelCase` in TypeScript interfaces.

## TypeScript Configuration

**`tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "exactOptionalPropertyTypes": true,
    "forceConsistentCasingInFileNames": true,
    "skipLibCheck": true,
    "declaration": true,
    "sourceMap": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "resolveJsonModule": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "test"]
}
```

**ESM Import Extensions**

With `"module": "NodeNext"`, explicit `.js` extensions are required in import paths.

```typescript
// Correct
import { ConfigLoader } from '../config/ConfigLoader.js';

// Wrong — will throw at runtime
import { ConfigLoader } from '../config/ConfigLoader';
```

## Code Conventions

**Module Structure**

Each module directory exposes its public API through an `index.ts` barrel.
Internal implementation files are not imported directly from outside the module.

**Classes**

Use classes for stateful components (services, managers, queues) and pure functions for stateless logic.
Constructor injection is the standard for dependency management.
No singleton pattern in production code except the logger module.
No global mutable state.

**Const Objects as Enums**

Prefer `const` objects over TypeScript `enum`.

```typescript
export const OperationType = {
  ADD: 'add',
  UPDATE: 'update',
  DELETE: 'delete',
} as const;

export type OperationType = typeof OperationType[keyof typeof OperationType];
```

**Error Handling**

* Define domain-specific error classes extending `Error` for each error category.
* Set `this.name` in the constructor to match the class name.
* Never throw raw strings. Never catch and silently discard errors.

```typescript
export class LockError extends Error {
  constructor(message: string, public readonly fileId: string) {
    super(message);
    this.name = 'LockError';
  }
}
```

**Async/Await**

Use `async/await` exclusively. Do not use raw `.then()` / `.catch()` chains in new code.
Always `await` promises — floating promises are forbidden.

**Forbidden Patterns**

* `any` type — disallowed. Use `unknown` when the type is genuinely unknown.
* Non-null assertion (`!`) without a `// REASON:` comment.
* `@ts-ignore` without a `// REASON:` comment.
* Raw `console.log` in production code — use the logger module exclusively.
* Hardcoded secrets, connection strings, or credentials in source files.
* `setInterval` for polling — use `setTimeout` with recalculated delay.

## Configuration Loading

Configuration is loaded by the `config/` module at startup and validated with `zod` before any other module initializes.
Validation failures terminate the process with exit code `1` and a descriptive error message.

Configuration hierarchy (lowest to highest priority):

- Config file (`config.yaml`)
- Environment variables (prefixed `EXCEL_API_`)
- Command-line arguments

## Logging

The logger module is in `src/logger/`. All log output goes through this module.

**Log Levels**: `ERROR`, `WARNING`, `MESSAGE`, `VERBOSE`, `TRACE`.

Console output format: `HH:MM:SS.mmm  LEVEL     Message text`.

All log messages are in English. Do not log sensitive data (tokens, passwords, secrets).

## Process Lifecycle

**Startup Sequence**

The entrypoint (`src/server.ts`) initializes modules in strict dependency order:

- Load and validate configuration — abort with exit code `1` on failure.
- Initialize the logger.
- Load and validate `access.yaml`.
- Initialize workbook cache (pre-load registered workbooks).
- Start the write queue consumers (one per workbook).
- Start the Fastify HTTP server.
- Register shutdown handlers.

No module is used before it is initialized.

**Graceful Shutdown**

The process listens for `SIGTERM` and `SIGINT`. On receipt:

- Stop accepting new HTTP connections.
- Wait for in-flight requests to complete (drain timeout).
- Flush pending write queues.
- Exit with code `0`.

Handlers are registered in initialization order and executed in reverse order (LIFO).

## Security

* Secrets are never stored in config files committed to version control.
* The `access.yaml` file is loaded with restricted file permission checks (warning if not `0600`).
* Secret values are never logged, even at `VERBOSE` level.
* Run `npm audit` on every CI build. High-severity vulnerabilities are not accepted.
* Dependencies are pinned via `package-lock.json`. Use `npm ci` in CI and Docker builds.
* The Docker image runs as a non-root user.

**Dockerfile Pattern**

```dockerfile
FROM node:22-alpine AS builder
WORKDIR /build
COPY package*.json ./
RUN npm ci --ignore-scripts
COPY tsconfig.json ./
COPY src/ ./src/
COPY resources/ ./resources/
RUN npm run build

FROM node:22-alpine
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev --ignore-scripts
COPY --from=builder /build/dist ./dist
COPY --from=builder /build/resources ./resources
USER appuser
CMD ["node", "dist/server.js"]
```

## Build

```json
{
  "scripts": {
    "build": "tsc",
    "start": "node dist/server.js",
    "dev": "tsx watch src/server.ts",
    "type-check": "tsc --noEmit",
    "lint": "eslint .",
    "format": "prettier --check .",
    "test": "jest",
    "test:coverage": "jest --coverage"
  }
}
```

## Testing

**Framework**: Jest with `ts-jest`.

**Requirements**: Unit test coverage ≥ 80%. Tests cover normal cases, boundary values, and error paths. Every new function must have unit tests before the implementation is considered complete.

**Test Style**: Use `describe` / `it` blocks. Group tests by module, then by method or behavior. Use `beforeEach` / `afterEach` to isolate state. Never share mutable state between test cases.

## Formatting and Linting

**ESLint**: `eslint.config.js` with `@typescript-eslint/strict-type-checked`.

**Prettier**: `.prettierrc` with `semi: true`, `singleQuote: true`, `trailingComma: "all"`, `printWidth: 100`, `tabWidth: 2`.

Both tools run in CI. A pull request that fails either check is not accepted.

## Comments

Code is self-documenting through naming. Limit comments to the absolute minimum.

* A `// REASON:` comment on a non-obvious decision.
* A reference to the relevant specification section.
* A block comment at the top of each module file stating its single responsibility.

Never use numbered comments. Do not comment what the code does. Do not leave commented-out code.

## General Principles

**Clean Code.** Write readable, self-documenting code.

**Single Responsibility.** Each function does one thing. Each class has one reason to change.

**SOLID.** Extend via composition. Keep core logic independent of HTTP transport and configuration loading. Depend on abstract interfaces at module boundaries.

**No Global State.** All state flows through constructors and function parameters.
