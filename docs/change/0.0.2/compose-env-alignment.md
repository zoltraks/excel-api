# Compose Env Alignment

**Type**: Fix

**Summary**: The Docker Compose files export `CONFIG_PATH`/`ACCESS_PATH` while every server loader resolves `CONFIG`/`ACCESS`/`WORK`, so the documented deployment cannot locate its configuration. Align the environment variable names so containers start as documented.

**Description**:

Audit finding FND-INF-002 / recommendation REC-004.

- `docker-compose.yaml` and `docker-compose.test.yaml` must export the variable names the loaders read: `CONFIG`, `ACCESS`, and `WORK`.
- The mounted paths `/etc/excel-api/config.yaml` and `/etc/excel-api/access.yaml` stay unchanged; only the variable names change.
- No server loader code changes in this change; the Compose files adapt to the loaders.
- After the change, `docker compose up` for each `IMAGE` value must reach a healthy state without manual environment overrides.

## Out of Scope

- Loader support for additional variable names.
- Changes to healthcheck definitions inside Dockerfiles.
