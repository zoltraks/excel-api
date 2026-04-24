# Go CLI Engineering Standards

## Scope

This document defines Go development standards for the Excel API Go CLI client.
It covers language version, project structure, coding conventions, dependency management, build system, and testing.

All paths below are relative to the `excel-api-go/` directory unless stated otherwise.

## Documentation

- [Effective Go](https://go.dev/doc/effective_go) — official style guide
- [Go Standard Library](https://pkg.go.dev/std) — official reference
- [chzyer/readline](https://github.com/chzyer/readline) — REPL line editing

## Core Technologies

* **Go 1.22+**: Language version. Use the latest stable release.
* **Standard `net/http`**: HTTP client for API communication. No external HTTP framework.
* **`encoding/json`**: JSON marshaling/unmarshaling.
* **`chzyer/readline`**: Interactive REPL with history and tab completion.
* **`gopkg.in/yaml.v3`**: YAML parsing for configuration.
* **Docker**: Multi-stage builds. Final image based on `scratch` or `gcr.io/distroless/static`.

Dependencies are added only when the need is concrete and the alternative is significantly more complex.

## Project Structure

```text
cmd/excel-api-go/
  main.go                    # Entry point, flag parsing

internal/
  client/
    client.go                # Connection, base HTTP methods, error handling
    auth.go                  # OAuth2 token acquisition and automatic refresh
    workbooks.go             # Workbook listing and details
    sheets.go                # Sheet metadata and columns
    records.go               # Record CRUD operations
    cells.go                 # Cell and range operations
    operations.go            # Batch operations
  cli/
    repl.go                  # Interactive REPL loop
    commands.go              # Command parsing and dispatch
    completer.go             # Tab completion for workbooks, sheets, columns
    context.go               # Session state (current connection, workbook, sheet)
  format/
    markdown.go              # Markdown table formatter
    csv.go                   # CSV formatter with configurable separator and qualifier
    json.go                  # JSON pretty-printer
    table.go                 # Plain text aligned table formatter
  config/
    config.go                # CLI configuration (server profiles, defaults)
    version.go               # Version constant

go.mod
go.sum
Dockerfile
README.md
```

* One `.go` file per logical unit. Split files when a file exceeds ~300 lines.
* Unit tests live in the same package as the implementation, named `*_test.go`.
* No circular dependencies between packages.
* All non-`main` packages live under `internal/` to prevent external import.

## Naming Conventions

**Code Conventions**

Follow the [Effective Go](https://go.dev/doc/effective_go) guidelines.

* **Exported types, functions, constants**: `PascalCase` — `Client`, `NewClient`, `Version`.
* **Unexported types, functions, constants**: `camelCase` — `doRequest`, `baseURL`, `tokenCache`.
* **Interfaces**: `PascalCase` or simple noun phrases — `Formatter`, `Completer`.
* **Package names**: single lowercase word — `client`, `cli`, `format`, `config`.
* **Constants**: `PascalCase` or `camelCase` depending on export — `Version`, `defaultTimeout`.
* **Acronyms**: Capitalize all letters for exported, first letter only for unexported — `HTTPClient`, `httpClient`.

**File Naming Conventions**

* **`snake_case.go`**: Source files — `client.go`, `auth.go`, `markdown.go`.
* **`snake_case_test.go`**: Test files — `client_test.go`, `csv_test.go`.
* **`go.mod`**: Module definition at project root.
* **`main.go`**: Entry point in `cmd/excel-api-go/`.

## Code Conventions

**Error Handling**

* All fallible functions return `error` as the last return value.
* Never ignore errors. Use `_` only with an explicit comment explaining why.
* Wrap errors with context using `fmt.Errorf` and `%w` verb.

```go
resp, err := c.httpClient.Do(req)
if err != nil {
    return nil, fmt.Errorf("request to %s failed: %w", url, err)
}
```

* Use `os.Exit(1)` for fatal CLI errors after printing the error message.

**HTTP Client**

* Use `http.Client` with a 30-second timeout.
* Always close response bodies with `defer resp.Body.Close()`.
* Check status codes for errors (≥ 400). Parse the error envelope.
* Set `Content-Type` and `Authorization` headers on every request.

```go
type Client struct {
    baseURL    string
    httpClient *http.Client
    token      string
}

func NewClient(baseURL string) *Client {
    return &Client{
        baseURL: strings.TrimRight(baseURL, "/"),
        httpClient: &http.Client{
            Timeout: 30 * time.Second,
        },
    }
}
```

**JSON Handling**

* Use `encoding/json` for all marshaling/unmarshaling.
* Use struct tags: `` `json:"field_name"` ``.
* For CLI JSON output, use `json.MarshalIndent` with 2-space indentation.
* JSON responses must be valid JSON objects, never top-level arrays.

**Token Management**

* OAuth2 tokens are cached in the `Client` struct for the session duration.
* On 401 `TOKEN_EXPIRED`, the client automatically re-authenticates and retries the request once.
* Credentials (client_id, client_secret, username, password) are held in memory only.

**UTF-8 and Newline Handling**

The `format/` package handles cell values that contain newlines, tabs, and Unicode characters.

* Markdown: `\n` replaced with configurable marker (default `<br>`).
* CSV: values containing separator, qualifier, or newlines are enclosed in the text qualifier. Default separator `,`, default qualifier `"`. Compliant with RFC 4180.
* Table: `\n` replaced with `↵` for column alignment.
* JSON: standard escaping, no special handling.

**Forbidden Patterns**

* `panic` for recoverable errors — use error returns.
* `init()` functions for complex setup — use explicit initialization in `main()`.
* Global mutable state — pass state through function parameters and struct fields.
* Hardcoded secrets or credentials in source files.

## Configuration and Profiles

The CLI supports named server profiles stored in a local config file (`~/.excel-api.yaml`).

```yaml
profiles:
  production:
    url: "https://excel.internal.example.com/api/v1"
    auth: "client_credentials"
    client_id: "integrator"
  staging:
    url: "https://excel-staging.internal.example.com/api/v1"
    auth: "token"
    token: "static-token-value"
default_profile: "production"
```

Profile selection: `--profile` flag > `default_profile` in config > direct `--url` flag.

## Version Management

Version is defined in `internal/config/version.go` as a constant.

```go
package config

const Version = "0.1.0"
```

The `--version` flag prints the version and exits.

## CLI Conventions

**Global Flags**

| Flag        | Short | Description                         |
| ----------- | ----- | ----------------------------------- |
| `--url`     | `-u`  | Server URL                          |
| `--profile` | `-p`  | Named connection profile            |
| `--format`  | `-f`  | Output format: json, csv, markdown  |
| `--verbose` | `-v`  | Increase verbosity                  |
| `--version` | `-V`  | Print version and exit              |
| `--help`    | `-h`  | Help for command                    |

**CSV Flags**

| Flag          | Short | Default | Description           |
| ------------- | ----- | ------- | --------------------- |
| `--separator` | `-s`  | `,`     | CSV field separator   |
| `--quote`     | `-q`  | `"`     | CSV text qualifier    |

**Newline Display Flag**

| Flag                | Default | Description                         |
| ------------------- | ------- | ----------------------------------- |
| `--newline-display` | `<br>`  | Replacement for newlines in tables  |

**Error Handling in Commands**

```go
func handleError(err error, jsonOutput bool) {
    if jsonOutput {
        printJSON(map[string]string{"error": err.Error()})
    } else {
        fmt.Fprintf(os.Stderr, "Error: %v\n", err)
    }
    os.Exit(1)
}
```

## Build

**Development build:**

```bash
cd cmd/excel-api-go
go build -o ../../bin/excel-api-go .
```

On Windows, the output file must have the `.exe` extension:

```bash
cd cmd/excel-api-go
go build -o ../../bin/excel-api-go.exe .
```

**Production build:**

```bash
cd cmd/excel-api-go
go build -ldflags="-s -w" -o ../../bin/excel-api-go .
```

On Windows:

```bash
cd cmd/excel-api-go
go build -ldflags="-s -w" -o ../../bin/excel-api-go.exe .
```

**Cross-compilation:**

```bash
GOOS=linux GOARCH=amd64 go build -ldflags="-s -w" -o bin/excel-api-go-linux-amd64 .
GOOS=darwin GOARCH=arm64 go build -ldflags="-s -w" -o bin/excel-api-go-darwin-arm64 .
GOOS=windows GOARCH=amd64 go build -ldflags="-s -w" -o bin/excel-api-go-windows-amd64.exe .
```

Binary size target: < 15 MB (Linux amd64).

**Dockerfile Pattern**

```dockerfile
FROM golang:1.22-alpine AS builder
WORKDIR /build
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build -ldflags="-s -w" -o /excel-api-go ./cmd/excel-api-go

FROM scratch
COPY --from=builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/
COPY --from=builder /excel-api-go /excel-api-go
ENTRYPOINT ["/excel-api-go"]
```

## Testing

**Framework**: Standard `testing` package.

**Requirements**: Unit test coverage ≥ 80%. Tests cover normal cases, boundary values, and error paths.

**Test Style**: Use table-driven tests for multiple cases.

```go
func TestFormatCSV(t *testing.T) {
    tests := []struct {
        name      string
        value     string
        separator string
        expected  string
    }{
        {"plain", "hello", ",", "hello"},
        {"with comma", "a,b", ",", "\"a,b\""},
        {"with newline", "a\nb", ",", "\"a\nb\""},
    }
    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            result := FormatCSVField(tt.value, tt.separator, "\"")
            if result != tt.expected {
                t.Errorf("got %q, want %q", result, tt.expected)
            }
        })
    }
}
```

**HTTP tests**: Use `net/http/httptest` for testing the API client against mock servers.

**Running tests:**

```bash
go test ./...
go test -cover ./...
go test -v ./...
```

## Formatting and Linting

**gofmt**: Standard Go formatting. Run `gofmt -w .` before committing.

**golangci-lint**: Comprehensive linter. Run `golangci-lint run` in CI.

## Comments

Code should be self-documenting. Follow Go documentation conventions.

* Package comments: each package has a package comment.
* Exported function comments: one sentence starting with the function name.
* Non-obvious algorithmic decisions: `// REASON:` comment.
* No commented-out code.

```go
// Package client provides an HTTP client for the Excel API.
package client

// NewClient creates a new API client for the given base URL.
func NewClient(baseURL string) *Client {
    // ...
}
```

## General Principles

**Clean Code.** Write readable, self-documenting code.

**Single Responsibility.** Each function does one thing. Each package has one focus.

**No Global State.** All state flows through function parameters and struct fields.

**Explicit Error Handling.** Every error is checked and wrapped with context.
