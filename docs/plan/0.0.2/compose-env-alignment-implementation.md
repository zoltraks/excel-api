# Compose Env Alignment — Implementation Plan

**Change Request Reference**: `docs/change/0.0.2/compose-env-alignment.md`

**Best Practices**: `docs/DEPLOYMENT.md` (container deployment conventions); no per-stack standard applies (Compose YAML only).

**Documentation Updates**: `docs/DEPLOYMENT.md` — the `CONFIG_PATH`/`ACCESS_PATH` env-var names in the running instructions must match the new exports.

**Step by Step Implementation**:

1. **Update `docker-compose.yaml`**
   - Replace `CONFIG_PATH`/`ACCESS_PATH` env entries with `CONFIG=/etc/excel-api/config.yaml`, `ACCESS=/etc/excel-api/access.yaml`, `WORK=/data` (workbook/lock dirs already mounted under `/data`).
   - Files: `docker-compose.yaml`.

2. **Update `docker-compose.test.yaml`**
   - Same env-var rename for the test harness service.
   - Files: `docker-compose.test.yaml`.

3. **Update `docs/DEPLOYMENT.md`**
   - Align the `docker run`/config section with the `CONFIG`/`ACCESS`/`WORK` names.
   - Files: `docs/DEPLOYMENT.md`.

4. **Smoke check**
   - `IMAGE=excel-api-node docker compose up` (and the other two) reaches healthy without manual env overrides.

**Testing Strategy**: Compose boot smoke check per implementation; no unit tests (infra config).

**Verification**: Per `docs/TESTING.md` verification loop — no compiled components touched; Compose smoke check is the verification. Security checks: N/A (no auth/dependency change).
