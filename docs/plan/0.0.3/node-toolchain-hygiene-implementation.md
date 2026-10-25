# Node Toolchain Hygiene - Implementation

*Retroactive record - the work landed in commit `811470b` alongside the Node
source cleanup; documented for plan-pairing completeness.*

## Change Request Reference

`docs/change/0.0.3/node-toolchain-hygiene.md`

## Best Practices

- `docs/standard/typescript-fastify-development.md` - formatting, dependencies.
- `docs/WORKFLOW.md` per-change cycle and verification loop.

## Documentation Updates

- `docs/standard/ts-node-development.md` (now
  `typescript-fastify-development.md`) - formatting and dependency rules
  updated where the toolchain changed.

## Steps

**Step 1 - Formatter configuration**

Add a Prettier configuration matching the adopted style (single quotes), then
reformat the tree in one pass so `npm run format` gates changes.

**Step 2 - Dependency vulnerability remediation**

Run `npm audit fix` for compatible upgrades first; evaluate `exceljs`
major-version impact separately; keep the `package-lock.json` diff reviewable.

**Step 3 - Config file permissions**

Confirm the `access.yaml` permission warning target (example file, fixture, or
mounted file) and set or document the expected `0600` mode.

## Testing Strategy

Unit tests rerun after the reformat pass; integration suite confirms no
behavioral change from dependency upgrades.

## Verification

`npm run build`, `npm run lint`, `npm test -- --run`, `npm run format --check`,
`npm audit` status reported - per the change record's verification notes.
