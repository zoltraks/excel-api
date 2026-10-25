# Excel API Test

Black-box integration test suite for the Excel API servers. Runs the same Jest
suite against any of the three implementations through the shared contract.

## Features

- Jest + TypeScript test suite exercising the OpenAPI contract end to end
- Per-area suites: authorization, workbooks, sheets, records, cells, ranges,
  batch operations, error handling
- Writable fixture workbooks in `fixture/`
- Docker Compose orchestration for any implementation

## Prerequisites

- Node.js 18+
- Docker (for containerized runs)

## Installation

```bash
npm install
```

## Running

```bash
# Against a running implementation
IMAGE=excel-api-node docker compose -f ../docker-compose.test.yaml up --abort-on-container-exit
npm test
```

Environment variables select the target server and credentials - see
`config/` and `docs/TESTING.md` for the setup contract.

## Layout

| Path | Purpose |
| ---- | ------- |
| `integration/` | Test suites per API area |
| `fixture/` | `.xlsx` workbooks used by the suites |
| `config/` | `config.yaml`/`access.yaml` test configuration |
| `helpers.ts`, `setup.ts` | Shared test client and harness setup |
