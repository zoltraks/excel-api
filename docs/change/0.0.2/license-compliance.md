# License Compliance

**Type**: Chore

**Summary**: The permissive-license allowlist in `docs/COPYRIGHTS.md` is unenforced — no SBOM, license report, or third-party notices exist, all 31 manifest components are `Unknown`, and the committed Go binary has no provenance. Generate a dependency inventory, enforce the allowlist, and publish attribution.

**Description**:

Audit findings FND-CPR-001 and FND-CPR-002 / recommendations REC-023 and REC-024.

- Produce a component inventory covering direct and transitive dependencies for all four manifests (npm×2, Maven, NuGet) — SPDX/CycloneDX via manifest tooling where available, or a documented manual inventory.
- Record resolved licenses for each component; flag any outside the `docs/COPYRIGHTS.md` allowlist (MIT, Apache 2.0, BSD, ISC, Boost).
- Resolve the `logstash-logback-encoder` dual Apache-2.0/LGPL-2.1 flag: either accept with a documented rationale or replace the dependency.
- Generate `THIRD-PARTY-NOTICES` at the repository root covering distributed components.
- Record build provenance for the Go binary path (commit + build flags) in docs or the notices file.

## Out of Scope

- CI wiring for the license check (CI is accepted-absent per `ci-acceptance`).
