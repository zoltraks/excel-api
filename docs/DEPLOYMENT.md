# Deployment

## Docker Images

Each implementation builds a self-contained Docker image.
The image includes the compiled application, the `openapi.yaml` contract, and runtime dependencies.
No external files are required except configuration (`config.yaml`, `access.yaml`) and workbook data.

**Building:**

```bash
cd excel-api-node
docker build -t excel-api-node .
```

**Running:**

```bash
docker run -p 8443:8443 \
  -v /path/to/config.yaml:/etc/excel-api/config.yaml:ro \
  -v /path/to/access.yaml:/etc/excel-api/access.yaml:ro \
  -v /path/to/workbooks:/data/workbooks \
  -v /path/to/locks:/data/locks \
  excel-api-node
```

## Docker Compose

The `docker-compose.yaml` in the repository root starts any implementation with shared volumes.

```bash
IMAGE=excel-api-java docker compose up
```

## Scaling Constraint

Deployments are single-node only. Workbooks live on local filesystem storage
and write serialization uses local advisory lockfiles (`queue.lock_dir`) — a
lockfile is only meaningful to processes sharing the same filesystem. Running
multiple replicas against the same workbook files offers no protection against
concurrent-write corruption, and cross-process instances on different hosts
cannot see each other's locks.

To scale horizontally you would need shared storage plus a distributed lock
implementation; neither is provided. Scale by dedicating one replica per
disjoint set of workbooks instead.

## Configuration

Mount `config.yaml` and `access.yaml` as read-only volumes.
Set `CONFIG`, `ACCESS`, and `WORK` environment variables if using non-default paths — `WORK` is the base directory for relative paths inside the configuration.

Ensure `access.yaml` has restrictive permissions (`0600`) on the host.
`access.yaml` stores `client_secret` values and static tokens in plaintext by design — this is an accepted posture.
The file must never be committed (it is git-ignored) and must be readable only by the service account; loaders warn if permissions are too open.
Credential comparisons use constant-time primitives on every implementation, so the plaintext values do not create a timing side channel.

## TLS

TLS is configured in `config.yaml` under `server.tls`:

```yaml
server:
  tls:
    enabled: true
    cert_file: "certs/server.crt"  # PEM certificate, relative to WORK or absolute
    key_file: "certs/server.key"   # PEM private key, relative to WORK or absolute
```

When `enabled` is true, all three implementations serve HTTPS on the configured
`server.host`/`server.port` listener and fail at startup if `cert_file` or
`key_file` are missing. Mount certificate and key files as read-only volumes.
Alternatively, keep `enabled: false` and terminate TLS at a reverse proxy in
front of the service.

## Health Check

All implementations expose `GET /health` without authentication.
Use this endpoint for container orchestrator health checks.

## Logging

All implementations output structured JSON logs to stdout.
Log level is configured in `config.yaml` under `logging.level`.
