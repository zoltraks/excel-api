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
IMPL=excel-api-java docker compose up
```

## Configuration

Mount `config.yaml` and `access.yaml` as read-only volumes.
Set `CONFIG_PATH` and `ACCESS_PATH` environment variables if using non-default paths.

Ensure `access.yaml` has restrictive permissions (`0600`) on the host.

## TLS

TLS is configured in `config.yaml` under `server.tls`.
Mount certificate and key files as read-only volumes.
For development, disable TLS and use a reverse proxy for termination.

## Health Check

All implementations expose `GET /health` without authentication.
Use this endpoint for container orchestrator health checks.

## Logging

All implementations output structured JSON logs to stdout.
Log level is configured in `config.yaml` under `logging.level`.
