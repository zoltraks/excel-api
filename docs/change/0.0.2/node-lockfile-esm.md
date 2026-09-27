# Node Lockfile ESM Fix

**Type**: Fix

**Summary**: `excel-api-node/src/lock/lockfile.ts` calls `require('os')` inside an ES module package, so every lock acquisition throws a `ReferenceError` that routes convert into `409 FILE_LOCKED`. Replace it with an ES import so the Node write path works at runtime.

**Description**:

Audit finding FND-CQY-001 / recommendation REC-005.

- Replace `require('os').hostname()` with `import * as os from 'os'` and `os.hostname()`.
- The fix must hold in the compiled `dist/` output, not only under the test runner.
- Add a unit assertion that `acquire` writes a lockfile with the documented fields.
- No behavior change beyond making the call actually execute.

## Out of Scope

- Atomic lockfile creation and the `locked_at` field rename are handled by the `lockfile-protocol` change.
