# Miscellaneous Hygiene — Implementation Plan

**Change Request Reference**: `docs/change/0.0.2/misc-hygiene.md`

**Best Practices**: `docs/GUIDELINES.md`, `docs/COPYRIGHTS.md` (provenance convention); `docs/standard/ts-node-development.md` (module layout); `docs/DEPLOYMENT.md` (container rules).

**Documentation Updates**: `docs/GUIDELINES.md` or `docs/COPYRIGHTS.md` (provenance convention); `docs/SPECIFICATION.md` if it describes `server.ts` contents.

**Step by Step Implementation**:

1. **AI-provenance convention**
   - Document the commit-trailer/review-evidence convention for generated code in `docs/GUIDELINES.md` (or `COPYRIGHTS.md`).
   - Files: `docs/GUIDELINES.md` or `docs/COPYRIGHTS.md`.

2. **Extract RotatingFileLogger**
   - Move `RotatingFileLogger` + the `onResponse`/content-type helpers from `server.ts` into `src/logger/`; keep `server.ts` bootstrap-only.
   - Files: `excel-api-node/src/server.ts`, `src/logger/` (new or existing index).

3. **Image healthchecks + digest pinning**
   - Add `HEALTHCHECK` (`wget -qO- http://localhost:PORT/health` or equivalent available binary) to the three server Dockerfiles; pin base images by digest.
   - Files: `excel-api-node/Dockerfile`, `excel-api-java/Dockerfile`, `excel-api-csharp/Dockerfile`.

**Testing Strategy**: Node unit tests still pass after extraction; `docker inspect` shows healthcheck.

**Verification**: `docs/TESTING.md` loop on `excel-api-node`; Docker build check on server images.
