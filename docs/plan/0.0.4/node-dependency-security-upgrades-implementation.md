# Node Dependency Security Upgrades - Implementation

## Change Request Reference

`docs/change/0.0.4/node-dependency-security-upgrades.md`

## Best Practices

- `docs/standard/typescript-fastify-development.md` - dependencies, validation conventions.

## Documentation Updates

- None expected; config schema and error envelopes stay identical.

## Steps

**Step 1 - Baseline**

`npm audit --omit=dev` - record the residual list (7 findings: uuid via
exceljs, zod, and chain).

**Step 2 - Zod 4**

`npm install zod@4`; run `tsc` - fix every call-site break (error API,
`safeParse` surface, deprecated helpers). Keep the accepted config shape and
emitted error envelope identical.

**Step 3 - UUID / exceljs**

`npm install uuid@11`; inspect `npm ls uuid` - if `exceljs` still resolves an
old uuid, add an `overrides` entry for uuid in `package.json`.

**Step 4 - Audit + suite**

`npm audit --omit=dev` - drive residuals to zero or a documented reasoned
remainder; `npm run build`, `npm run lint`, `npm test -- --run` stay green.

## Testing Strategy

The 123-test vitest suite plus `npm run format --check`; manual config-load
smoke against `work/example` config where practical.

## Verification

`npm audit` residual report quoted in the final summary; build, lint, and
test commands green.
