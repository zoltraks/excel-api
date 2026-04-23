# Excel API Java

Java/Spring Boot implementation of the Excel API using Apache POI. This implementation provides a robust, enterprise-grade HTTP server for reading and manipulating Excel workbook data via REST endpoints.

## Features

- **Spring Boot Framework**: Built on Spring Boot 3.x with Java 21 for modern Java features
- **Apache POI Integration**: Uses Apache POI for Excel file operations
- **Spring Security**: Comprehensive security with JWT and OAuth2 support
- **Configuration Properties**: Externalized configuration via YAML and properties files
- **Metrics**: OpenMetrics-compatible metrics endpoint
- **Health Checks**: Spring Boot Actuator health endpoint
- **Format Support**: Multiple output formats (native, display, string)
- **CORS Support**: Configurable CORS for cross-origin requests
- **Profile Support**: Spring profiles for environment-specific configuration

## Prerequisites

- Java 21+
- Maven 3.8+

## Installation

```bash
mvn clean install
```

## Quick Start

### Development Mode

```bash
mvn spring-boot:run
```

The server will start on `http://localhost:8443/api/v1` (configurable via application.properties).

### Production Mode

```bash
mvn package
java -jar target/excel-api-0.0.1.jar
```

## Build

```bash
# Clean build
mvn clean compile

# Package JAR
mvn package

# Build Docker image
docker build -t excel-api-java .
```

## Configuration

The server uses Spring Boot configuration properties. Configure via `src/main/resources/application.yaml` or environment variables.

### Configuration Structure

**application.yaml** contains:
- Server settings (port, host, context path, TLS)
- CORS settings (enabled, allowed origins, methods, headers)
- Workbook registry (list of workbook entries with paths and readonly flags)
- JWT settings (issuer, expiration, algorithm)
- Logging configuration

**access.yaml** contains:
- JWT secret
- OAuth2 clients and users
- Static tokens
- ACL rules (scope-based access control)

Example configuration:
```yaml
server:
  port: 8443
  host: 0.0.0.0
  base-path: /api/v1
  tls:
    enabled: false

workbooks:
  registry:
    - id: sample
      path: /data/workbooks/sample.xlsx
      readonly: false

auth:
  mode: both
  jwt:
    issuer: excel-api-java
    expiration-minutes: 60
    algorithm: HS256
```

## Running with Docker

Using Docker Compose with the IMAGE environment variable:

```bash
IMAGE=excel-api-java docker compose up
```

## Testing

### Unit Tests

```bash
mvn test
```

### Linting

```bash
mvn checkstyle:check
```

### Integration Tests

Run integration tests using the test project:

```bash
IMAGE=excel-api-java docker compose -f docker-compose.test.yaml up --abort-on-container-exit
```

### CLI Testing

Use the Go CLI to test the implementation interactively:

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

## API Endpoints

- `GET /api/v1/health` - Health check endpoint
- `GET /api/v1/metrics` - OpenMetrics format metrics
- `GET /api/v1/workbooks` - List all workbooks
- `GET /api/v1/workbooks/{id}` - Get workbook details
- `GET /api/v1/workbooks/{id}/sheets/{sheetName}` - Get sheet metadata
- `GET /api/v1/workbooks/{id}/sheets/{sheetName}/columns` - Get column definitions
- `GET /api/v1/workbooks/{id}/sheets/{sheetName}/cells/{cellRef}` - Get cell value
- `PUT /api/v1/workbooks/{id}/sheets/{sheetName}/cells/{cellRef}` - Set cell value
- `GET /api/v1/workbooks/{id}/sheets/{sheetName}/ranges/{rangeRef}` - Get range values
- `GET /api/v1/workbooks/{id}/sheets/{sheetName}/records` - List records
- `GET /api/v1/workbooks/{id}/sheets/{sheetName}/records/{recordIndex}` - Get specific record
- `POST /api/v1/workbooks/{id}/sheets/{sheetName}/records` - Add new record
- `PUT /api/v1/workbooks/{id}/sheets/{sheetName}/records/{recordIndex}` - Update record
- `DELETE /api/v1/workbooks/{id}/sheets/{sheetName}/records/{recordIndex}` - Delete record
- `POST /api/v1/auth/token` - OAuth2 token endpoint
- `GET /api/v1/openapi.yaml` - OpenAPI specification

## Environment Variables

- `CONFIG_PATH` - Path to config.yaml file (default: /etc/excel-api/config.yaml)
- `ACCESS_PATH` - Path to access.yaml file (default: /etc/excel-api/access.yaml)
- `SERVER_PORT` - Server port (overrides configuration)
- `SERVER_HOST` - Server host (overrides configuration)

## Development

### Code Style

```bash
mvn checkstyle:check
mvn checkstyle:checkstyle
```

### Clean Build

```bash
mvn clean compile
```

## Development Standard

See `docs/standard/java-spring-maven-development.md` in the repository root for detailed development guidelines.
