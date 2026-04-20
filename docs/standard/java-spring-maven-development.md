# Java/Spring Boot/Maven Engineering Standards

## Scope

This document defines Java development standards for the Excel API Java implementation.
It covers language version, project structure, coding conventions, build system, testing, and tooling.

All paths below are relative to the `excel-api-java/` directory unless stated otherwise.

## Documentation

- [Spring Boot Reference](https://docs.spring.io/spring-boot/reference/) — official documentation
- [Apache POI](https://poi.apache.org/) — Excel file operations
- [Maven](https://maven.apache.org/guides/) — build system

## Core Technologies

* **Java 21**: Language version. Use LTS release. Use records, sealed classes, pattern matching where appropriate.
* **Spring Boot 3.x**: Application framework. Minimal Spring — no Spring Data, no Spring Security (custom auth).
* **Apache POI 5.x**: Excel file operations. XSSF for `.xlsx` read-modify-write.
* **Maven**: Build system. No Gradle.
* **JUnit 5**: Testing framework with Mockito for mocking.
* **Checkstyle**: Code style enforcement.
* **Docker**: Multi-stage builds. Final image based on `eclipse-temurin:21-jre-alpine`.

Dependencies are added only when the need is concrete and the alternative is significantly more complex.

## Project Structure

```text
src/main/
  java/pl/alyx/api/excel/
    Application.java              # Spring Boot entry point (@SpringBootApplication)
    config/
      AppConfig.java              # Configuration POJO bound to config.yaml
      AccessConfig.java           # Sensitive config POJO bound to access.yaml
      ConfigLoader.java           # YAML loading and validation
    auth/
      AuthFilter.java             # Servlet filter: JWT and static token validation
      TokenEndpoint.java          # POST /auth/token (OAuth2 grants)
      JwtService.java             # JWT signing and verification
    controller/
      WorkbookController.java     # Workbook and sheet endpoints
      RecordController.java       # Record CRUD endpoints
      CellController.java         # Cell and range endpoints
      OperationController.java    # Batch operation endpoints
      HealthController.java       # Health and OpenAPI endpoints
    service/
      WorkbookService.java        # Workbook registry, metadata
      SheetService.java           # Sheet and column metadata
      RecordService.java          # Record-level operations
      CellService.java            # Cell-level operations
      CacheService.java           # In-memory cache with mtime polling
    queue/
      WriteQueue.java             # BlockingQueue + single-thread executor per workbook
      WriteOperation.java         # Operation record with CompletableFuture
    excel/
      ExcelReader.java            # POI read operations, cached value extraction
      ExcelWriter.java            # POI write operations, style copy
      LockManager.java            # Lockfile protocol implementation
  resources/
    openapi.yaml                  # Contract copy, on classpath
    application.yaml              # Spring Boot config (port, profiles)

config/
  config.example.yaml             # Example configuration
  access.example.yaml             # Example sensitive configuration
```

**Package**: `pl.alyx.api.excel`. All classes live under this root package.

One `.java` file per public class. Split files when a class exceeds ~300 lines.
No circular dependencies between packages.

## Naming Conventions

**Code Conventions**

Follow standard Java conventions.

* **Classes**: `PascalCase` — `WorkbookService`, `WriteQueue`, `ExcelReader`.
* **Interfaces**: `PascalCase` — `ExcelOperations`, `LockProvider`.
* **Methods**: `camelCase` — `loadConfig()`, `enqueueWrite()`, `acquireLock()`.
* **Variables**: `camelCase` — `currentBatch`, `lockTimeout`, `workbookCache`.
* **Constants**: `UPPER_SNAKE_CASE` — `DEFAULT_BATCH_SIZE`, `MAX_QUEUE_DEPTH`.
* **Packages**: all lowercase — `pl.alyx.api.excel.config`, `pl.alyx.api.excel.queue`.
* **Enums**: `PascalCase` for type, `UPPER_SNAKE_CASE` for values — `OperationType.ADD`.

**File Naming Conventions**

* **`PascalCase.java`**: Source files match the public class name.
* **`PascalCaseTest.java`**: Test files in the corresponding test package.

## Code Conventions

**Records for DTOs**

Use Java records for request/response DTOs, configuration POJOs, and immutable data carriers.

```java
public record BatchResult(
    String op,
    String status,
    int index
) {}
```

**Sealed Classes for Domain Types**

Use sealed classes for operation types and error categories.

```java
public sealed interface WriteOp permits AddOp, UpdateOp, DeleteOp {
    String sheetName();
}
```

**Error Handling**

* Define domain-specific exceptions extending `RuntimeException`.
* Use `@ControllerAdvice` to map exceptions to HTTP error responses.
* Never catch and silently discard exceptions.
* Never return raw stack traces in HTTP responses.

```java
public class LockTimeoutException extends RuntimeException {
    private final String fileId;

    public LockTimeoutException(String fileId) {
        super("Lock timeout for workbook: " + fileId);
        this.fileId = fileId;
    }

    public String getFileId() {
        return fileId;
    }
}
```

**Dependency Injection**

Use constructor injection exclusively. No field injection. No setter injection.

```java
@Service
public class WorkbookService {
    private final AppConfig config;
    private final CacheService cache;

    public WorkbookService(AppConfig config, CacheService cache) {
        this.config = config;
        this.cache = cache;
    }
}
```

**Null Handling**

Use `Optional<T>` for return values that may be absent. Never return `null` from a public method.
Use `@Nullable` annotation on parameters that accept null.

**Forbidden Patterns**

* `var` for non-obvious types — use explicit types when the inferred type is not immediately clear.
* Raw types (e.g., `List` instead of `List<String>`).
* Checked exceptions in new code — wrap in `RuntimeException` subclass.
* `System.out.println` — use SLF4J logger exclusively.
* Hardcoded secrets or credentials in source files.

## Configuration Loading

Configuration is loaded at startup using a custom `ConfigLoader` that reads YAML via Jackson or SnakeYAML and binds to `AppConfig` / `AccessConfig` POJOs.

Spring Boot's native `application.yaml` is used only for framework-level settings (port, profiles). Application-specific configuration uses `config.yaml` and `access.yaml`.

Configuration hierarchy (lowest to highest priority):

- Config file (`config.yaml`)
- Environment variables (prefixed `EXCEL_API_`)
- JVM system properties

Validation failures terminate the application with exit code `1` and a descriptive error message logged at `ERROR` level.

## Logging

Use SLF4J with Logback. All log output goes through the SLF4J facade.

**Log Levels**: `ERROR`, `WARN`, `INFO`, `DEBUG`, `TRACE`.

Structured JSON output for production. Human-readable format for development (controlled by Spring profile).

All log messages are in English. Do not log sensitive data.

```java
private static final Logger log = LoggerFactory.getLogger(WorkbookService.class);

log.info("Loading workbook: fileId={}", fileId);
log.error("Lock timeout: fileId={}, timeout={}ms", fileId, timeout, ex);
```

## Process Lifecycle

**Startup Sequence**

Spring Boot initializes beans in dependency order. Custom initialization runs in a `@PostConstruct` method on the `Application` class or via `ApplicationRunner`:

- Validate `config.yaml` and `access.yaml`.
- Pre-load workbook cache for registered files.
- Start write queue executor threads (one per workbook).
- Register shutdown hook for graceful drain.

**Graceful Shutdown**

Spring Boot's `server.shutdown=graceful` with `spring.lifecycle.timeout-per-shutdown-phase=30s`.
Custom shutdown logic drains write queues before the application context closes.

## Security

* Secrets are never stored in config files committed to version control.
* `access.yaml` is loaded with file permission checks (warning if not `0600`).
* Secret values are never logged.
* Run `mvn dependency-check:check` (OWASP Dependency Check) in CI.
* The Docker image runs as a non-root user.

**Dockerfile Pattern**

```dockerfile
FROM eclipse-temurin:21-jdk-alpine AS builder
WORKDIR /build
COPY pom.xml ./
RUN mvn dependency:go-offline -B
COPY src/ ./src/
RUN mvn package -DskipTests -B

FROM eclipse-temurin:21-jre-alpine
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
WORKDIR /app
COPY --from=builder /build/target/excel-api-*.jar app.jar
USER appuser
ENTRYPOINT ["java", "-jar", "app.jar"]
```

## Build

```xml
<build>
    <plugins>
        <plugin>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-maven-plugin</artifactId>
        </plugin>
        <plugin>
            <groupId>org.apache.maven.plugins</groupId>
            <artifactId>maven-checkstyle-plugin</artifactId>
        </plugin>
    </plugins>
</build>
```

Common Maven commands:

- `mvn package` — compile, test, package
- `mvn test` — run unit tests
- `mvn checkstyle:check` — code style check
- `mvn dependency:tree` — inspect dependency graph

## Testing

**Framework**: JUnit 5 with Mockito.

**Requirements**: Unit test coverage ≥ 80%. Tests cover normal cases, boundary values, and error paths.

**Test Style**: Use `@Test`, `@DisplayName`, `@Nested` for organization. Use `@BeforeEach` / `@AfterEach` for setup and teardown.

```java
@Nested
@DisplayName("WriteQueue")
class WriteQueueTest {
    @Test
    @DisplayName("batches operations within debounce window")
    void batchesWithinDebounce() {
        // ...
    }
}
```

**Mock HTTP**: Use `MockMvc` for controller tests. Use `WireMock` for external HTTP mocking.

## Formatting

Use Checkstyle with a project-specific configuration. Key rules: 4-space indentation, 120-character line limit, braces on same line, no wildcard imports.

## Comments

Code is self-documenting through naming. Limit comments to the absolute minimum.

* Javadoc on public API classes and methods (one sentence).
* A `// REASON:` comment on non-obvious decisions.
* No commented-out code.

## General Principles

**Clean Code.** Write readable, self-documenting code.

**Single Responsibility.** Each class has one reason to change.

**SOLID.** Constructor injection for dependencies. Interfaces at module boundaries. Composition over inheritance.

**No Global State.** All state managed by Spring-scoped beans. No static mutable fields.
