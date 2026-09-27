# License Compliance — Implementation Plan

**Change Request Reference**: `docs/change/0.0.2/license-compliance.md`

**Best Practices**: `docs/COPYRIGHTS.md` (allowlist policy); SBOM tooling per ecosystem.

**Documentation Updates**: `docs/COPYRIGHTS.md` — note the enforcement artifact (notices file + inventory location).

**Step by Step Implementation**:

1. **Dependency inventory**
   - Generate a component inventory across `excel-api-node/package.json` (+lockfile), `excel-api-test/package.json` (+lockfile), `excel-api-java/pom.xml`, `excel-api-csharp/*.csproj` — SPDX/CycloneDX where tooling exists, else a documented manual table.
   - Output into `work/` during analysis; the committed artifact is the notices file.

2. **License resolution + allowlist check**
   - Resolve declared licenses per component; flag anything outside MIT/Apache-2.0/BSD/ISC/Boost. Resolve the `logstash-logback-encoder` Apache-2.0/LGPL-2.1 dual-license question (accept with rationale or replace).

3. **License review record**
   - Record the resolved inventory, flagged components, and dispositions in `docs/COPYRIGHTS.md` (License Review Convention) instead of a dedicated notices file — the maintainer opted not to carry `THIRD-PARTY-NOTICES` in the repository.

4. **Provenance**
   - Record Go binary build provenance (commit + flags) in docs; covered further by `misc-hygiene`.

**Testing Strategy**: None (compliance artifact).

**Verification**: License review covers resolved dependencies; policy violations flagged and dispositioned in `docs/COPYRIGHTS.md`.
