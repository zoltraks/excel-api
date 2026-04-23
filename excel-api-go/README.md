# Excel API Go

Command-line client for the Excel API. This CLI tool connects to any server implementation (Node.js, Java, C#) for interactive or batch operations on Excel workbook data via REST endpoints.

## Features

- **Cross-Platform**: Runs on Linux, macOS, and Windows
- **Single Binary**: Self-contained executable with no external dependencies
- **Batch Operations**: Execute multiple commands efficiently
- **Interactive REPL**: Interactive mode for exploratory testing
- **Multiple Formats**: Support for native, display, and string output formats
- **Flexible Server Connection**: Connect to any Excel API server implementation
- **Health and Metrics**: Query server health and performance metrics
- **Authentication**: Support for token-based authentication

## Prerequisites

- Go 1.21+
- git

## Installation

```bash
# Clone the repository
git clone <repository-url>
cd excel-api-go

# Build the binary
go build -o excel-api-go ./cmd/excel-api-go
```

## Quick Start

```bash
# Build the binary
go build -o excel-api-go ./cmd/excel-api-go

# Show server statistics (default server: http://localhost:8443)
./excel-api-go --stats

# List all workbooks
./excel-api-go --list-workbooks

# Get a cell value
./excel-api-go --get-cell sample:Sheet1:A1
```

## Commands

- `--version` - Print version and exit
- `--stats` - Show server statistics (metrics)
- `--list-workbooks` - List all workbooks
- `--get-workbook <id>` - Get workbook by ID
- `--get-cell <workbookId:sheetName:cellRef>` - Get cell value
- `--set-cell <workbookId:sheetName:cellRef:value>` - Set cell value
- `--get-range <workbookId:sheetName:rangeRef>` - Get range values
- `--list-records <workbookId:sheetName>` - List records
- `--get-record <workbookId:sheetName:recordIndex>` - Get record by index
- `--format <native|display|string>` - Output format (default: native)
- `--server <url>` - Server URL (default: http://localhost:8443)
- `--token <token>` - Authentication token
- `--repl` - Start interactive REPL mode

## Examples

```bash
# Show server metrics
./excel-api-go --stats

# List workbooks
./excel-api-go --list-workbooks

# Get a cell value
./excel-api-go --get-cell sample:Sheet1:A1

# Set a cell value
./excel-api-go --set-cell sample:Sheet1:A1:42

# Get a range
./excel-api-go --get-range sample:Sheet1:A1:C10

# List records
./excel-api-go --list-records sample:Sheet1

# Get a specific record
./excel-api-go --get-record sample:Sheet1:5

# Use display format
./excel-api-go --get-cell sample:Sheet1:A1 --format display

# Connect to specific server
./excel-api-go --server https://excel.example.com/api/v1 --list-workbooks

# Use authentication token
./excel-api-go --token my-secret-token --list-workbooks

# Interactive REPL mode
./excel-api-go --repl
```

## Build

```bash
# Standard build
go build -o excel-api-go ./cmd/excel-api-go

# Optimized build with stripped symbols
go build -ldflags="-s -w" -o excel-api-go ./cmd/excel-api-go
```

## Cross-Compilation

```bash
# Linux AMD64
GOOS=linux GOARCH=amd64 go build -ldflags="-s -w" -o excel-api-go-linux-amd64 ./cmd/excel-api-go

# Linux ARM64
GOOS=linux GOARCH=arm64 go build -ldflags="-s -w" -o excel-api-go-linux-arm64 ./cmd/excel-api-go

# macOS ARM64 (Apple Silicon)
GOOS=darwin GOARCH=arm64 go build -ldflags="-s -w" -o excel-api-go-darwin-arm64 ./cmd/excel-api-go

# macOS AMD64 (Intel)
GOOS=darwin GOARCH=amd64 go build -ldflags="-s -w" -o excel-api-go-darwin-amd64 ./cmd/excel-api-go

# Windows AMD64
GOOS=windows GOARCH=amd64 go build -ldflags="-s -w" -o excel-api-go-windows-amd64.exe ./cmd/excel-api-go
```

## Testing

### Unit Tests

```bash
go test ./...
```

### Linting

```bash
gofmt -l .
```

### Integration Testing

Use the CLI to test any server implementation:

```bash
# Start a server implementation (e.g., Node.js)
cd ../excel-api-node
npm run dev

# In another terminal, test with CLI
cd ../excel-api-go
go build -o excel-api-go ./cmd/excel-api-go

# Test the server
./excel-api-go --server http://localhost:8443 --list-workbooks
./excel-api-go --server http://localhost:8443 --get-cell workbook1:sheet1:A1
```

### REPL Mode

Start interactive mode for exploratory testing:

```bash
./excel-api-go --server http://localhost:8443 --repl
```

In REPL mode, you can execute commands interactively without specifying the server each time.

## Configuration

The CLI uses command-line flags for configuration. No configuration files are required.

### Environment Variables

You can use environment variables to set default values:

```bash
export EXCEL_API_SERVER=http://localhost:8443
export EXCEL_API_TOKEN=your-token

# Now you can omit --server and --token
./excel-api-go --list-workbooks
```

## Development

### Code Style

```bash
# Format code
gofmt -w .

# Run linter
golangci-lint run
```

### Testing

```bash
# Run all tests
go test ./...

# Run tests with coverage
go test -cover ./...

# Run tests with verbose output
go test -v ./...
```

## Development Standard

See `docs/standard/go-cli-development.md` in the repository root for detailed development guidelines.
