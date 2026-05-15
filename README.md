# Excel API

HTTP service exposing Excel spreadsheet data as a JSON API with queued write operations and file-level locking for concurrent access.

The project provides three interchangeable server implementations sharing a single OpenAPI contract, plus a command-line client for interactive and batch operations.

## Components

| Component      | Stack                   | Directory          | Purpose                                    |
| -------------- | ----------------------- | ------------------ | ------------------------------------------ |
| API Server     | Node.js + TypeScript    | `excel-api-node/`  | Lightweight implementation using ExcelJS   |
| API Server     | Java 21 + Spring Boot   | `excel-api-java/`  | Full-featured implementation using POI     |
| API Server     | C# + ASP.NET 8          | `excel-api-csharp/`| Mid-weight implementation using ClosedXML  |
| CLI Client     | Go 1.22+                | `excel-api-go/`    | Interactive and batch console client       |
| Test Suite     | TypeScript + Jest       | `excel-api-test/`  | Black-box integration tests for any server |

## Documentation

| Document                                         | Purpose                                         |
| ---------------------------------------------- | ------------------------------------------- |
| `docs/PROJECT.md`                                | Project description and requirements            |
| `docs/ARCHITECTURE.md`                           | Shared architecture, API contract, data model   |
| `docs/SPECIFICATION.md`                          | Implementation details per component            |
| `docs/GUIDELINES.md`                             | Repository rules and development workflow       |
| `docs/TESTING.md`                                | Testing strategy and instructions               |
| `docs/DEPLOYMENT.md`                             | Deployment instructions and Docker usage        |
| `docs/contract/openapi.yaml`                     | Authoritative OpenAPI 3.1 specification         |
| `docs/standard/ts-node-development.md`           | TypeScript/Node.js coding standard              |
| `docs/standard/java-spring-maven-development.md` | Java/Spring/Maven coding standard               |
| `docs/standard/csharp-aspnet-development.md`     | C#/ASP.NET coding standard                      |
| `docs/standard/go-cli-development.md`            | Go CLI coding standard                          |

## Quick Start

Build and run the Node implementation:

```bash
cd excel-api-node
docker build -t excel-api-node .
docker run -p 8443:8443 -v ./config:/etc/excel-api:ro excel-api-node
```

Or use Docker Compose to start any implementation:

```bash
IMAGE=excel-api-node docker compose up
```

Run integration tests against a running implementation:

```bash
IMAGE=excel-api-java docker compose -f docker-compose.test.yaml up --abort-on-container-exit
```

## Configuration

All three server implementations share the same two-file configuration format.

**`config.yaml`** contains non-sensitive settings: server port and TLS, workbook registry, queue parameters, cache settings, authorization mode, JWT issuer and expiration, logging level and format, and OpenAPI metadata overrides.

**`access.yaml`** contains sensitive data: JWT signing secret, OAuth2 client credentials and user password hashes, static token values with names and scopes, and ACL rules mapping scopes to allowed HTTP methods. This file should have restrictive permissions (`0600`).

**Creating Configuration Files**

Copy example files for the implementation you want to run.

**Node.js**

```bash
cd excel-api-node
cp config/config.example.yaml config/config.yaml
cp config/access.example.yaml config/access.yaml
```

**Java**

```bash
cd excel-api-java
cp config/config.example.yaml config/config.yaml
cp config/access.example.yaml config/access.yaml
```

**C#**

```bash
cd excel-api-csharp
cp config/config.example.yaml config/config.yaml
cp config/access.example.yaml config/access.yaml
```

Edit both files to match your environment. The example files contain placeholder values that must be changed before production use.

**Configuration File Structure**

**`config.yaml`**

```yaml
server:
  port: 8443
  host: "0.0.0.0"
  base_path: "/api/v1"
  tls:
    enabled: false

openapi:
  title: "Excel API"
  description: "Excel file data service"
  servers:
    - url: "http://localhost:8443/api/v1"
      description: "Local"

registry:
  directory: "/data/workbooks"
  workbooks:
    - id: "sample"
      path: "sample.xlsx"
      readonly: false

queue:
  batch_max_size: 50
  batch_debounce_ms: 200
  lock_timeout_ms: 30000
  lock_dir: "/data/locks"

cache:
  enabled: true
  invalidation: "mtime"
  poll_interval_ms: 2000

auth:
  mode: "both"
  jwt:
    issuer: "excel-api"
    expiration_minutes: 60
    algorithm: "HS256"

logging:
  level: "info"
  format: "json"
```

**`access.yaml`**

```yaml
jwt:
  secret: "change-this-to-a-random-string-min-256-bits"

oauth2:
  clients:
    - client_id: "default-client"
      client_secret: "change-this-secret"
      grant_types: ["client_credentials", "password"]
      scopes: ["read", "write"]
  users:
    - username: "admin"
      password_hash: "$2b$12$example-hash-replace-me"
      scopes: ["read", "write", "admin"]

tokens:
  static:
    - token: "dev-token-change-me"
      name: "development"
      scopes: ["read", "write"]

acl:
  rules:
    - scope: "read"
      allow: ["GET"]
    - scope: "write"
      allow: ["GET", "POST", "PUT", "DELETE"]
    - scope: "admin"
      allow: ["GET", "POST", "PUT", "DELETE"]
      admin_endpoints: true
```

**Specifying Configuration Paths**

All server implementations accept the same command-line parameters and environment variables for configuration resolution.

**Command-line parameters**

- `--work` — working directory (base for relative path resolution)
- `--config` — path to `config.yaml`
- `--access` — path to `access.yaml`
- `--life` — lifecycle limit (e.g., `30s`, `5m`, `2h`)

**Environment variables**

- `WORK` — working directory
- `CONFIG` — path to `config.yaml`
- `ACCESS` — path to `access.yaml`
- `LIFE` — lifecycle limit

Override hierarchy (highest to lowest): command-line arguments > environment variables > configuration file values.

**Path resolution logic**

If `--work` or `WORK` is set, relative config paths resolve against the working directory. If no custom path is given, the server looks for `config/config.yaml` and `config/access.yaml` relative to the working directory (or the current directory if no working directory is set).

**Running with a custom working directory**

**Node.js**

```bash
cd excel-api-node
npm run build
node dist/server.js --work ../work
```

**Java**

```bash
cd excel-api-java
mvn spring-boot:run --args="--work ../work"
```

**C#**

```bash
cd excel-api-csharp/src/ExcelApi
dotnet run -- --work ../../work
```

## Testing Each Implementation

### Node.js Implementation

**Build:**
```bash
cd excel-api-node
npm run build
```

**Lint:**
```bash
npm run lint
```

**Unit Tests:**
```bash
npm test -- --run
```

**Integration Tests:**
```bash
IMAGE=excel-api-node docker compose -f docker-compose.test.yaml up --abort-on-container-exit
```

**CLI Testing:**
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

### Java Implementation

**Build:**
```bash
cd excel-api-java
mvn clean compile
```

**Lint:**
```bash
mvn checkstyle:check
```

**Unit Tests:**
```bash
mvn test
```

**Integration Tests:**
```bash
IMAGE=excel-api-java docker compose -f docker-compose.test.yaml up --abort-on-container-exit
```

**CLI Testing:**
```bash
# Build the CLI
cd ../excel-api-go
go build -o excel-api-go ./cmd/excel-api-go

# Start the Java server
cd ../excel-api-java
mvn spring-boot:run

# In another terminal, test with CLI
./excel-api-go --server http://localhost:8443/api/v1 --list-workbooks
./excel-api-go --server http://localhost:8443/api/v1 --get-cell workbook1:sheet1:A1
```

### C# Implementation

**Build:**
```bash
cd excel-api-csharp/src/ExcelApi
dotnet build
```

**Lint:**
```bash
dotnet format --verify-no-changes
```

**Unit Tests:**
```bash
cd ../ExcelApi.Test
dotnet test
```

**Integration Tests:**
```bash
IMAGE=excel-api-csharp docker compose -f docker-compose.test.yaml up --abort-on-container-exit
```

**CLI Testing:**
```bash
# Build the CLI
cd ../../excel-api-go
go build -o excel-api-go ./cmd/excel-api-go

# Start the C# server
cd ../../excel-api-csharp/src/ExcelApi
dotnet run

# In another terminal, test with CLI
./excel-api-go --server http://localhost:8443 --list-workbooks
./excel-api-go --server http://localhost:8443 --get-cell workbook1:sheet1:A1
```

### Go CLI

**Build:**
```bash
cd excel-api-go
go build -o excel-api-go ./cmd/excel-api-go
```

**Lint:**
```bash
gofmt -l .
```

**Unit Tests:**
```bash
go test ./...
```

## License

MIT. See `LICENSE.md`.
