# Excel API Go

Command-line client for the Excel API. Connects to any server implementation for interactive or batch operations on Excel workbook data.

## Quick Start

```bash
go build -o bin/excel-api-go ./cmd/excel-api-go
./bin/excel-api-go --url https://excel.example.com/api/v1
```

## Build

```bash
go build -ldflags="-s -w" -o bin/excel-api-go ./cmd/excel-api-go
```

## Cross-Compilation

```bash
GOOS=linux GOARCH=amd64 go build -ldflags="-s -w" -o bin/excel-api-go-linux-amd64 ./cmd/excel-api-go
GOOS=darwin GOARCH=arm64 go build -ldflags="-s -w" -o bin/excel-api-go-darwin-arm64 ./cmd/excel-api-go
GOOS=windows GOARCH=amd64 go build -ldflags="-s -w" -o bin/excel-api-go-windows-amd64.exe ./cmd/excel-api-go
```

## Development Standard

See `docs/standard/go-cli-development.md` in the repository root.
