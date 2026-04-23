# Excel API Node

Node.js/TypeScript implementation of the Excel API using ExcelJS. This implementation provides a high-performance HTTP server for reading and manipulating Excel workbook data via REST endpoints.

## Features

- **High Performance**: Built on Fastify framework for optimal performance
- **ExcelJS Integration**: Uses ExcelJS for Excel file operations
- **Type Safety**: Full TypeScript implementation with type definitions
- **Authentication**: Supports JWT tokens, OAuth2 (client_credentials and password grants), and static tokens
- **Access Control**: Role-based access control with ACL rules
- **Metrics**: OpenMetrics-compatible metrics endpoint
- **Health Checks**: Health endpoint with server status and uptime
- **Format Support**: Multiple output formats (native, display, string, csv, markdown, table)
- **Queue System**: Batch operations with debouncing and lock management
- **Caching**: MTIME-based cache invalidation

## Prerequisites

- Node.js 18+ 
- npm or yarn

## Installation

```bash
npm install
```

## Quick Start

### Development Mode

```bash
npm run dev
```

The server will start on `http://localhost:8443` (configurable via environment variables).

### Production Mode

```bash
npm run build
npm start
```

## Build

```bash
# Build TypeScript to JavaScript
npm run build

# Build Docker image
docker build -t excel-api-node .
```

## Configuration

The server uses YAML configuration files. Copy the example files and configure:

```bash
# Copy example configuration files
cp config/config.example.yaml config/config.yaml
cp config/access.example.yaml config/access.yaml
```

Set environment variables to point to your configuration files:

```bash
export CONFIG_PATH=/path/to/config.yaml
export ACCESS_PATH=/path/to/access.yaml
```

### Configuration Structure

**config.yaml** contains:
- Server settings (port, host, base path, TLS)
- OpenAPI specification
- Workbook registry (base directory, workbook entries)
- Queue settings (batch size, debounce, lock timeout)
- Cache settings (enabled, invalidation method, poll interval)
- Authentication mode (none, jwt, static, both)
- JWT settings (issuer, expiration, algorithm)
- Logging settings (level, format, file output)

**access.yaml** contains:
- JWT secret
- OAuth2 clients and users
- Static tokens
- ACL rules (scope-based access control)

## Running with Docker

Using Docker Compose with the IMAGE environment variable:

```bash
IMAGE=excel-api-node docker compose up
```

## Testing

### Unit Tests

```bash
npm test
```

### Linting

```bash
npm run lint
```

### Integration Tests

Run integration tests using the test project:

```bash
IMAGE=excel-api-node docker compose -f docker-compose.test.yaml up --abort-on-container-exit
```

### CLI Testing

Use the Go CLI to test the implementation interactively:

```bash
# Build the CLI
cd ../excel-api-go
go build -o excel-api-go ./cmd/excel-api-go

# Start the Node.js server
cd ../excel-api-node
npm run dev

# In another terminal, test with CLI
./excel-api-go --server http://localhost:8443 --list-workbooks
./excel-api-go --server http://localhost:8443 --get-cell workbook1:sheet1:A1
```

## API Endpoints

- `GET /health` - Health check endpoint
- `GET /metrics` - OpenMetrics format metrics
- `GET /workbooks` - List all workbooks
- `GET /workbooks/{id}` - Get workbook details
- `GET /workbooks/{id}/sheets/{sheetName}` - Get sheet metadata
- `GET /workbooks/{id}/sheets/{sheetName}/columns` - Get column definitions
- `GET /workbooks/{id}/sheets/{sheetName}/cells/{cellRef}` - Get cell value
- `PUT /workbooks/{id}/sheets/{sheetName}/cells/{cellRef}` - Set cell value
- `GET /workbooks/{id}/sheets/{sheetName}/ranges/{rangeRef}` - Get range values
- `GET /workbooks/{id}/sheets/{sheetName}/records` - List records
- `GET /workbooks/{id}/sheets/{sheetName}/records/{recordIndex}` - Get specific record
- `POST /workbooks/{id}/sheets/{sheetName}/records` - Add new record
- `PUT /workbooks/{id}/sheets/{sheetName}/records/{recordIndex}` - Update record
- `DELETE /workbooks/{id}/sheets/{sheetName}/records/{recordIndex}` - Delete record
- `POST /auth/token` - OAuth2 token endpoint
- `GET /openapi.yaml` - OpenAPI specification

## Environment Variables

- `CONFIG_PATH` - Path to config.yaml file (default: /etc/excel-api/config.yaml)
- `ACCESS_PATH` - Path to access.yaml file (default: /etc/excel-api/access.yaml)
- `CONFIG_PROFILE` - Profile name to use from config profiles
- `PORT` - Server port (overrides config.yaml)
- `HOST` - Server host (overrides config.yaml)

## Development

### Code Style

```bash
npm run lint
npm run format
```

### Type Checking

```bash
npm run build
```

## Development Standard

See `docs/standard/ts-node-development.md` in the repository root for detailed development guidelines.
