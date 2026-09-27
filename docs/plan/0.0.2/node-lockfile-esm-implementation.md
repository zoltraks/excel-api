# Node Lockfile ESM Fix — Implementation Plan

**Change Request Reference**: `docs/change/0.0.2/node-lockfile-esm.md`

**Best Practices**: `docs/standard/ts-node-development.md` (ESM NodeNext imports, forbidden patterns).

**Documentation Updates**: None — the documented lockfile behavior is the target the code now meets.

**Step by Step Implementation**:

1. **Fix the ESM violation**
   - Add `import * as os from 'os';` at the top; replace `require('os').hostname()` with `os.hostname()`.
   - Files: `excel-api-node/src/lock/lockfile.ts`.

2. **Add a lockfile-shape regression test**
   - Extend the lock module's unit tests: `acquire` produces a file containing `pid`, `hostname`, `timestamp` (renamed to `locked_at` in `lockfile-protocol` — keep current field until that change), `implementation`; `release` removes it.
   - Files: the existing lockfile test file in `excel-api-node` (or create `src/lock/lockfile.test.ts` mirroring conventions).

3. **Verify against the compiled artifact**
   - `npm run build` then exercise `acquire` against `dist/` (e.g., a scratch script in `work/` or the existing test harness pointed at compiled output) to prove the `require` fault is gone — not just under Vitest.

**Testing Strategy**: Unit test on lockfile shape + a compiled-artifact sanity check.

**Verification**: `docs/TESTING.md` loop on `excel-api-node`: typecheck, lint/format, unit tests, `npm run build`. Security checks: N/A beyond routine.
