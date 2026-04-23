# Excel API C#

C#/ASP.NET 8 implementation of the Excel API using ClosedXML with ReadyToRun compilation. This implementation provides a high-performance, cross-platform HTTP server for reading and manipulating Excel workbook data via REST endpoints.

## Features

- **ASP.NET 8**: Built on ASP.NET 8 with .NET 8.0 for modern C# features
- **ClosedXML Integration**: Uses ClosedXML for Excel file operations
- **ReadyToRun Compilation**: Pre-compiled for faster startup and better performance
- **Self-Contained Deployment**: Single-file deployment option for easy distribution
- **Metrics**: OpenMetrics-compatible metrics endpoint
- **Health Checks**: Health endpoint with server status and uptime
- **Format Support**: Multiple output formats (native, display, string)
- **Rotating File Logger**: Configurable file logging with rotation
- **Cross-Platform**: Runs on Linux, macOS, and Windows

## Prerequisites

- .NET 8.0 SDK
- dotnet CLI

## Installation

```bash
cd src/ExcelApi
dotnet restore
```

## Quick Start

### Development Mode

```bash
cd src/ExcelApi
dotnet run
```

The server will start on `http://0.0.0.0:8443` (configurable via appsettings.json).

### Production Mode

```bash
cd src/ExcelApi
dotnet build -c Release
dotnet publish -c Release --self-contained
```

## Build

```bash
# Debug build
cd src/ExcelApi
dotnet build

# Release build
dotnet build -c Release

# Self-contained publish
dotnet publish -c Release --self-contained -r linux-x64
```

## Configuration

The server uses ASP.NET Core configuration via `appsettings.json`. Configure via `src/ExcelApi/appsettings.json` or environment variables.

### Configuration Structure

**appsettings.json** contains:
- Server URLs
- Workbook registry (list of workbook entries with paths and readonly flags)
- Sheet header configurations (mode, identifier row, type row, description row)
- File logging configuration

**access.yaml** contains:
- JWT secret
- OAuth2 clients and users
- Static tokens
- ACL rules (scope-based access control)

Example configuration:
```json
{
  "Server": {
    "Urls": "http://0.0.0.0:8443"
  },
  "Workbooks": {
    "Registry": [
      {
        "Id": "sample",
        "Path": "/data/workbooks/sample.xlsx",
        "Readonly": false
      }
    ]
  }
}
```

## Running with Docker

Using Docker Compose with the IMAGE environment variable:

```bash
IMAGE=excel-api-csharp docker compose up
```

## Testing

### Unit Tests

```bash
cd src/ExcelApi.Test
dotnet test
```

### Linting

```bash
cd src/ExcelApi
dotnet format --verify-no-changes
```

### Integration Tests

Run integration tests using the test project:

```bash
IMAGE=excel-api-csharp docker compose -f docker-compose.test.yaml up --abort-on-container-exit
```

### CLI Testing

Use the Go CLI to test the implementation interactively:

```bash
# Build the CLI
cd ../excel-api-go
go build -o excel-api-go ./cmd/excel-api-go

# Start the C# server
cd ../excel-api-csharp/src/ExcelApi
dotnet run

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

## Environment Variables

- `CONFIG_PATH` - Path to config.yaml file (default: /etc/excel-api/config.yaml)
- `ACCESS_PATH` - Path to access.yaml file (default: /etc/excel-api/access.yaml)
- `LOGGING_FILE_ENABLED` - Enable file logging (default: false)
- `LOGGING_FILE_PATH` - Path to log file (default: /var/log/excel-api/excel-api-csharp.log)
- `LOGGING_FILE_MAX_FILES` - Maximum number of log files to keep (default: 7)

## Development

### Code Style

```bash
cd src/ExcelApi
dotnet format
```

### Clean Build

```bash
cd src/ExcelApi
dotnet clean
dotnet build
```

## Development Standard

See `docs/standard/csharp-aspnet-development.md` in the repository root for detailed development guidelines.
