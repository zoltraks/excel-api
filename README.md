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

| Document                                         | Purpose                                           |
| ------------------------------------------------ | ------------------------------------------------- |
| `docs/PROJECT.md`                                | Project description and requirements              |
| `docs/ARCHITECTURE.md`                           | Shared architecture, API contract, data model     |
| `docs/SPECIFICATION.md`                          | Implementation details per component              |
| `docs/GUIDELINES.md`                             | Repository rules and development workflow         |
| `docs/TESTING.md`                                | Testing strategy and instructions                 |
| `docs/DEPLOYMENT.md`                             | Deployment instructions and Docker usage           |
| `docs/contract/openapi.yaml`                     | Authoritative OpenAPI 3.1 specification           |
| `docs/standard/ts-node-development.md`           | TypeScript/Node.js coding standard                |
| `docs/standard/java-spring-maven-development.md` | Java/Spring/Maven coding standard                 |
| `docs/standard/csharp-aspnet-development.md`     | C#/ASP.NET coding standard                        |
| `docs/standard/go-cli-development.md`            | Go CLI coding standard                            |

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
