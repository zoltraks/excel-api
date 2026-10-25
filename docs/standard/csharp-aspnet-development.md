# C#/ASP.NET Engineering Standards

<!-- Standards set: csharp-general-development.md@0.1.6, csharp-aspnet-development.md@0.1.2 | Date: 2026-10-25 -->

## Scope

This document defines C# development standards for the Excel API C# implementation.
It covers language version, project structure, coding conventions, build system, testing, and tooling.

All paths below are relative to the `excel-api-csharp/` directory unless stated otherwise.

## Documentation

- [ASP.NET Core Minimal APIs](https://learn.microsoft.com/en-us/aspnet/core/fundamentals/minimal-apis) — official reference
- [ClosedXML](https://closedxml.github.io/ClosedXML/) — Excel file operations
- [ReadyToRun](https://learn.microsoft.com/en-us/dotnet/core/deploying/ready-to-run) — R2R compilation

## Core Technologies

* **.NET 8**: Target framework. Use LTS release.
* **C# 12**: Language version. Use primary constructors, collection expressions, raw string literals where appropriate.
* **ASP.NET Minimal API**: HTTP framework. No MVC controllers pattern — use `MapGet`, `MapPost`, etc.
* **ClosedXML 0.102+**: Excel file operations. Read-modify-write with style preservation.
* **ReadyToRun (R2R)**: Pre-compilation for fast startup. Not full Native AOT (see SPECIFICATION.md for rationale).
* **MSTest**: Testing framework.
* **dotnet format**: Code style enforcement via `.editorconfig`.
* **Docker**: Multi-stage builds. Final image based on `mcr.microsoft.com/dotnet/runtime-deps:8.0-alpine` (self-contained).

Dependencies are added only when the need is concrete and the alternative is significantly more complex.

## Project Structure

```text
src/ExcelApi/
  Program.cs                    # Entry point, Minimal API setup, DI registration
  Options/
    DurationParser.cs           # Duration string parsing for config option values
    ServerOptions.cs            # Server binding options bound to config.yaml
    AccessOptions.cs            # Sensitive options bound to access.yaml
    WorkbookOptions.cs          # Workbook registry and sheet-header options
    QueueOptions.cs             # Write-queue options
    RateLimitOptions.cs         # Rate-limiting options
    LoggingOptions.cs           # File logging options
    AuthOptions.cs              # Authentication options
    OptionsLoader.cs            # YAML loading and validation
    OptionsPathResolver.cs      # ${VAR} expansion and path resolution
  Security/
    AuthMiddleware.cs           # JWT and static token validation middleware
    AuthService.cs              # Credential and token verification
    JwtService.cs               # JWT signing and verification
  Contracts/
    AddRecordRequest.cs         # Record creation contract
    UpdateRecordRequest.cs      # Record update contract
    WriteCellRequest.cs         # Cell write contract
    BatchRequests.cs            # Batch operation contracts
  Endpoints/
    WorkbookEndpoints.cs        # Workbook and sheet route groups
    SheetEndpoints.cs           # Sheet metadata route groups
    RecordEndpoints.cs          # Record CRUD route groups
    CellEndpoints.cs            # Cell and range route groups
    OperationsEndpoints.cs      # Batch operation route groups
    AuthEndpoints.cs            # Token route groups
    HealthEndpoints.cs          # Health route groups
    OpenApiEndpoints.cs         # OpenAPI route groups
    ErrorMapping.cs             # Exception-to-HTTP mapping
  Metrics/
    MetricsCollector.cs         # Request and operation metrics
  Logging/
    JsonConsoleFormatter.cs     # JSON console output
    JsonLogger.cs               # JSON logger provider
    RotatingFileLogger.cs       # Rotating file sink
  Services/
    ExcelService.cs             # ClosedXML read-modify-write operations
    FileLockService.cs          # Lockfile protocol implementation
    WriteQueueService.cs        # Per-workbook write queue and batching
    SheetLayout.cs              # Header-mode resolution
  Resources/
    openapi.yaml                # Contract copy, embedded resource
  ExcelApi.csproj               # Project file with R2R config

tests/ExcelApi.Tests/
  Options/                      # Tests mirroring Options/
  Services/                     # Tests mirroring Services/
  Logging/                      # Tests mirroring Logging/
  GlobalUsings.cs               # Shared test usings
  ExcelApi.Tests.csproj         # ProjectReference to ../../src/ExcelApi

config/
  config.example.yaml           # Example configuration
  access.example.yaml           # Example sensitive configuration
  appsettings.example.json      # Example ASP.NET settings (appsettings.json is not used)

ExcelApi.sln
```

The project folder root holds only `Program.cs` and `ExcelApi.csproj` - every other type lives in a role folder. A helper used by a single consumer goes into that consumer's domain folder, never loose at the root.

**Namespace**: `BigBytes.ExcelApi`. All classes live under this root namespace.
Sub-namespaces mirror the directory structure (IDE0130): `BigBytes.ExcelApi.Options`, `BigBytes.ExcelApi.Services`, etc.
Test namespaces mirror the source tree under the test assembly: `ExcelApi.Tests.Options`.

**Folder naming**: plural category names where the folder groups one kind of thing (`Options`, `Services`, `Contracts`, `Endpoints`), singular mass nouns for cross-cutting concerns (`Security`, `Logging`, `Metrics`). Bound settings classes carry the `Options` suffix; wiring lives in `*Loader`/registration types. This implementation follows .NET naming even where the other implementations differ - parity across implementations lives in behavior (config keys, endpoint groups, error codes, log fields), not in file or folder names.

One `.cs` file per public type. Split files when a class exceeds ~300 lines.
No circular dependencies between namespace groups.

## Naming Conventions

**Code Conventions**

Follow standard C# conventions.

* **Classes**: `PascalCase` — `WorkbookService`, `WriteQueue`, `ExcelReader`.
* **Interfaces**: `PascalCase` with `I` prefix — `IExcelReader`, `ILockManager`, `ICacheService`.
* **Methods**: `PascalCase` — `LoadConfig()`, `EnqueueWrite()`, `AcquireLock()`.
* **Properties**: `PascalCase` — `BatchSize`, `LockTimeout`, `IsReadonly`.
* **Local variables and parameters**: `camelCase` — `currentBatch`, `lockTimeout`.
* **Private fields**: `_camelCase` — `_config`, `_cache`, `_channel`.
* **Constants**: `PascalCase` — `DefaultBatchSize`, `MaxQueueDepth`.
* **Async methods**: Suffix with `Async` — `EnqueueAsync()`, `ExecuteBatchAsync()`.
* **Namespaces**: `PascalCase` — `BigBytes.ExcelApi.Config`.

**File Naming Conventions**

* **`PascalCase.cs`**: Source files match the public type name.
* **`PascalCaseTests.cs`**: Test files in the corresponding test project.

## Code Conventions

**Records for DTOs**

Use records for request/response DTOs and immutable data carriers.

```csharp
public record BatchResult(string Op, string Status, int Index);

public record WriteOperation(
    string FileId,
    string SheetName,
    OperationType Type,
    int? RowIndex,
    Dictionary<string, object>? RowData,
    TaskCompletionSource<OperationResult> Completion
);
```

**Primary Constructors for Services**

Use C# 12 primary constructors for DI-injected services.

```csharp
public class ExcelService(WorkbookOptions options)
{
    public List<string> ReadSheetNames(string filePath)
    {
        // ...
    }
}
```

**Error Handling**

* Define domain-specific exceptions.
* Use exception-handling middleware to map exceptions to HTTP error responses.
* Never catch and silently discard exceptions.
* Never return stack traces in HTTP responses.

```csharp
public class LockTimeoutException(string fileId)
    : Exception($"Lock timeout for workbook: {fileId}")
{
    public string FileId { get; } = fileId;
}
```

**Null Handling**

Enable nullable reference types project-wide (`<Nullable>enable</Nullable>`).
Use `?` suffix for nullable types. Use `??` and `?.` operators. Never use `!` (null-forgiving) without a `// REASON:` comment.

**Per-Workbook Lane Pattern**

`WriteQueueService` serializes writes per workbook with a `SemaphoreSlim` gate per lane, so writes to the same workbook never interleave while different workbooks run in parallel. Pending depth is tracked per lane and capped at `batch_max_size`; excess submissions throw `ServiceBusyException` (`503 SERVICE_BUSY`).

```csharp
public class WriteQueueService
{
    private readonly ConcurrentDictionary<string, Lane> _lanes = new();

    private sealed class Lane
    {
        public readonly SemaphoreSlim Gate = new SemaphoreSlim(1, 1);
        public int Pending;
    }
}
```

**Forbidden Patterns**

* `dynamic` type — disallowed.
* `null!` without a `// REASON:` comment.
* `#pragma warning disable` without a `// REASON:` comment.
* `Console.WriteLine` — use `ILogger` exclusively.
* Hardcoded secrets or credentials in source files.
* `async void` — use `async Task` exclusively (except event handlers).
* `Thread.Sleep` in async code — use `await Task.Delay`.
* `.Result` or `.Wait()` on a task — use `await`; blocking risks deadlock and wastes a thread.
* `Contains` used as a prefix test — anchor the check positionally; a needle found mid-string is not a leading marker.

## Configuration Loading

Configuration is loaded at startup using a custom `OptionsLoader` that reads YAML via YamlDotNet and binds to `*Options` POCOs (`ServerOptions`, `AccessOptions`, `WorkbookOptions`, and the rest under `Options/`).

ASP.NET's built-in `appsettings.json` is not used for application configuration. The application uses `config.yaml` and `access.yaml` exclusively.

Configuration hierarchy (lowest to highest priority):

- Config file (`config.yaml`)
- Environment variables (prefixed `EXCEL_API_`)
- Command-line arguments

Validation failures terminate the application with exit code `1`.

## Logging

Use `Microsoft.Extensions.Logging` (`ILogger<T>`). Structured JSON output via a logging provider (Serilog or built-in JSON formatter).

All log messages are in English. Do not log sensitive data.

```csharp
public class ExcelService(ILogger<ExcelService> logger, WorkbookOptions options)
{
    public void LoadWorkbook(string filePath)
    {
        logger.LogInformation("Loading workbook: {FilePath}", filePath);
    }
}
```

## Process Lifecycle

**Startup Sequence**

`Program.cs` registers services and middleware in order:

- Load and validate `config.yaml` and `access.yaml` through `OptionsLoader`.
- Configure the Kestrel listener (TLS when `server.tls.enabled`), JSON logging, CORS, and rate limiting.
- Construct the service instances (`ExcelService`, `FileLockService`, `WriteQueueService`, `AuthService`, `JwtService`, `MetricsCollector`) and register JSON formatting.
- Attach `AuthMiddleware` and map route groups per resource (`Map*Endpoints` extension methods receiving their dependencies explicitly).
- Run the application.

**Graceful Shutdown**

ASP.NET handles graceful shutdown via `CancellationToken` propagation. `QueueHostedService.StopAsync()` drains the channel and waits for the current batch to complete.

## Security

* Secrets are never stored in config files committed to version control.
* `access.yaml` is loaded with file permission checks.
* Secret values are never logged.
* The Docker image runs as a non-root user.

**Dockerfile Pattern**

```dockerfile
FROM mcr.microsoft.com/dotnet/sdk:8.0-alpine AS builder
WORKDIR /build
COPY src/ExcelApi/ExcelApi.csproj ./src/ExcelApi/
RUN dotnet restore src/ExcelApi/ExcelApi.csproj
COPY src/ ./src/
RUN dotnet publish src/ExcelApi/ExcelApi.csproj \
    -c Release -o /app --self-contained \
    -p:PublishReadyToRun=true

FROM mcr.microsoft.com/dotnet/runtime-deps:8.0-alpine
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
WORKDIR /app
COPY --from=builder /app .
USER appuser
ENTRYPOINT ["./ExcelApi"]
```

## Build

**Project file** (`ExcelApi.csproj`):

```xml
<Project Sdk="Microsoft.NET.Sdk.Web">
  <PropertyGroup>
    <TargetFramework>net8.0</TargetFramework>
    <Nullable>enable</Nullable>
    <ImplicitUsings>enable</ImplicitUsings>
    <RootNamespace>BigBytes.ExcelApi</RootNamespace>
    <ReadyToRun>true</ReadyToRun>
    <SelfContained>true</SelfContained>
  </PropertyGroup>
  <ItemGroup>
    <EmbeddedResource Include="Resources\openapi.yaml" />
  </ItemGroup>
</Project>
```

Common commands:

- `dotnet build` — compile
- `dotnet test` — run unit tests
- `dotnet publish -c Release` — publish with R2R
- `dotnet format --verify-no-changes` — code style check

## Testing

**Framework**: MSTest.

**Requirements**: Unit test coverage ≥ 80%.

**Test Style**: Use `[TestMethod]` for single assertions, `[DataTestMethod]` with `[DataRow]` for parameterized tests. Use `TestInitialize`/`TestCleanup` attributes for setup and teardown.

```csharp
[TestClass]
public class WriteQueueServiceTests
{
    [TestMethod]
    public async Task SubmitAsync_SerializesWritesPerWorkbook()
    {
        // Arrange, Act, Assert
    }

    [DataTestMethod]
    [DataRow(0)]
    [DataRow(50)]
    [DataRow(1000)]
    public async Task SubmitAsync_RespectsMaxBatchSize(int batchSize)
    {
        // ...
    }
}
```

## Formatting

Use `.editorconfig` for code style. Key rules: 4-space indentation, `var` when type is apparent, file-scoped namespaces, braces on new line (Allman style).

`using` directives keep one placement consistently across the solution - above the file-scoped namespace declaration.

`dotnet format` enforces the `.editorconfig` rules. A build that fails formatting check is not accepted.

## Comments

Code is self-documenting through naming. Limit comments to the absolute minimum.

* XML doc comments on public API types and methods (one sentence `<summary>`).
* A `// REASON:` comment on non-obvious decisions.
* No commented-out code.

## General Principles

**Clean Code.** Write readable, self-documenting code.

**Single Responsibility.** Each class has one reason to change.

**SOLID.** Constructor injection for dependencies. Interfaces at service boundaries. Composition over inheritance.

**No Global State.** All state managed by DI-scoped services. No static mutable fields.
