# Miscellaneous Hygiene

**Type**: Chore

**Summary**: Three low-severity hygiene items: no AI-provenance convention exists despite the policy in `docs/COPYRIGHTS.md`, the Node `RotatingFileLogger` lives inside `server.ts` against the documented bootstrap-only role, and server Dockerfiles lack `HEALTHCHECK` with tag-pinned (not digest-pinned) base images.

**Description**:

Audit findings FND-AIP-001, FND-ARC-006, and FND-INF-005 / recommendations REC-029, REC-031, and REC-032.

- **Provenance convention**: document a lightweight AI-contribution convention in `docs/GUIDELINES.md` or `docs/COPYRIGHTS.md` — a commit trailer (e.g., `Generated-with:`/`Co-Authored-By:`) plus retained review evidence for generated code.
- **Logger extraction**: move `RotatingFileLogger` (and the onResponse/content-type helpers it owns) from `excel-api-node/src/server.ts` into `src/logger/`, leaving `server.ts` as bootstrap-only wiring per `docs/SPECIFICATION.md`.
- **Container hygiene**: add a `HEALTHCHECK` instruction to the three server Dockerfiles (`wget`/`curl` against `/health` or equivalent in the image), and pin base images by digest.
- Verify `docker inspect` reports the healthcheck on built images.

## Out of Scope

- Compose-level healthcheck changes (already present).
- New logging features.
