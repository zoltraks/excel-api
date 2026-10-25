# Implementation Plan - Cross-Implementation File Interop

## Change Request Reference

`docs/change/0.0.7/cross-impl-file-interop.md`

## Best Practices

- `docs/standard/typescript-fastify-development.md`
- `docs/standard/rust-general-development.md` + `rust-api-development.md`

## Documentation Updates

- `docs/SPECIFICATION.md` - only if the fix changes documented behavior

## Step by Step Implementation

**Reproduce.** Keep the four-server `work/itest` setup; rerun
`work/itest/cross_test.py` to confirm both failures on demand.

**Node foreign-package load.** Landed as `loadWorkbookXlsx` in
`src/excel/operations.ts`: on any ExcelJS parse failure, rewrite the
package in memory with JSZip - drop `docProps/*` and strip the `x:`
element prefix foreign writers put on every spreadsheetml element -
then retry. Applied to all load sites in `operations.ts` and
`batch.ts`.

**Rust foreign-package load.** Landed as a `load_normalized`
fallback in `src/excel/mod.rs` (`excel::load`): an empty sheet
collection after a successful read triggers the same in-memory rewrite
(`zip` crate, added as a direct dependency) and a `read_reader` retry.
No cache-layer change needed - mtime invalidation was already correct.

**Re-verify.** `work/itest/cross_test.py` to zero failures; Jest
suite (`API_URL=http://localhost:<port>/api/v1 npx jest --runInBand`
from `excel-api-test/`) green against all four servers with fixture
restores between runs.

## Testing Strategy

- Unit: regression test for foreign-saved-file reads (Node docProps,
  Rust sheet reload) where the stack supports a fixture.
- Live: the cross_test matrix plus the full Jest suite per server.

## Verification

Per `docs/TESTING.md` loops on `excel-api-node` and `excel-api-rust`;
live cross-verification as described above.
