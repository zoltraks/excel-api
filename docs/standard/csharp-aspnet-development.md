# C#/ASP.NET Engineering Standards

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
* **xUnit**: Testing framework with Moq for mocking.
* **dotnet format**: Code style enforcement via `.editorconfig`.
* **Docker**: Multi-stage builds. Final image based on `mcr.microsoft.com/dotnet/runtime-deps:8.0-alpine` (self-contained).

Dependencies are added only when the need is concrete and the alternative is significantly more complex.

## Project Structure

```text
src/ExcelApi/
  Program.cs                    # Entry point, Minimal API setup, DI registration
  Config/
    AppConfig.cs                # Configuration POCO bound to config.yaml
    AccessConfig.cs             # Sensitive config POCO bound to access.yaml
    ConfigLoader.cs             # YAML loading and validation
  Auth/
    AuthMiddleware.cs           # JWT and static token validation middleware
    TokenEndpoint.cs            # POST /auth/token (OAuth2 grants)
    JwtService.cs               # JWT signing and verification
  Controllers/
    WorkbookEndpoints.cs        # Workbook and sheet route groups
    RecordEndpoints.cs          # Record CRUD route groups
    CellEndpoints.cs            # Cell and range route groups
    OperationEndpoints.cs       # Batch operation route groups
    HealthEndpoints.cs          # Health and OpenAPI route groups
  Services/
    WorkbookService.cs          # Workbook registry, metadata
    SheetService.cs             # Sheet and column metadata
    RecordService.cs            # Record-level operations
    CellService.cs              # Cell-level operations
    CacheService.cs             # In-memory cache with mtime polling
  Queue/
    WriteQueue.cs               # Channel<T>-based queue per workbook
    WriteOperation.cs           # Operation record with TaskCompletionSource
    QueueHostedService.cs       # BackgroundService consuming from channels
  Excel/
    ExcelReader.cs              # ClosedXML read operations
    ExcelWriter.cs              # ClosedXML write operations, style copy
    LockManager.cs              # Lockfile protocol implementation
  Resources/
    openapi.yaml                # Contract copy, embedded resource
  ExcelApi.csproj               # Project file with R2R config

config/
  config.example.yaml           # Example configuration
  access.example.yaml           # Example sensitive configuration

ExcelApi.sln
```

**Namespace**: `BigBytes.ExcelApi`. All classes live under this root namespace.
Sub-namespaces mirror the directory structure: `BigBytes.ExcelApi.Config`, `BigBytes.ExcelApi.Queue`, etc.

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
public class WorkbookService(AppConfig config, ICacheService cache)
{
    public WorkbookInfo GetWorkbook(string fileId)
    {
        var entry = config.Workbooks.Registry
            .FirstOrDefault(w => w.Id == fileId)
            ?? throw new WorkbookNotFoundException(fileId);
        return cache.GetWorkbookInfo(entry);
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

**Channel\<T\> Queue Pattern**

```csharp
public class WriteQueue
{
    private readonly Channel<WriteOperation> _channel =
        Channel.CreateBounded<WriteOperation>(1000);

    public async Task<OperationResult> EnqueueAsync(
        WriteOperation op, CancellationToken ct)
    {
        await _channel.Writer.WriteAsync(op, ct);
        return await op.Completion.Task;
    }

    public async Task ProcessAsync(CancellationToken ct)
    {
        var batch = new List<WriteOperation>();

        while (await _channel.Reader.WaitToReadAsync(ct))
        {
            batch.Clear();
            while (_channel.Reader.TryRead(out var op))
                batch.Add(op);

            if (batch.Count == 0) continue;
            await ExecuteBatch(batch);
        }
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

## Configuration Loading

Configuration is loaded at startup using a custom `ConfigLoader` that reads YAML via YamlDotNet and binds to `AppConfig` / `AccessConfig` POCOs.

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
public class WorkbookService(ILogger<WorkbookService> logger, AppConfig config)
{
    public void LoadWorkbook(string fileId)
    {
        logger.LogInformation("Loading workbook: {FileId}", fileId);
    }
}
```

## Process Lifecycle

**Startup Sequence**

`Program.cs` registers services and middleware in order:

- Load and validate `config.yaml` and `access.yaml`.
- Register services in DI container.
- Configure authentication middleware.
- Map route groups (workbooks, records, cells, operations, health).
- Start `QueueHostedService` (one per workbook).
- Pre-load workbook cache.

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

**Framework**: xUnit with Moq.

**Requirements**: Unit test coverage ≥ 80%.

**Test Style**: Use `[Fact]` for single assertions, `[Theory]` with `[InlineData]` for parameterized tests. Use `IAsyncLifetime` for async setup/teardown.

```csharp
public class WriteQueueTests
{
    [Fact]
    public async Task EnqueueAsync_BatchesOperationsWithinDebounceWindow()
    {
        // Arrange, Act, Assert
    }

    [Theory]
    [InlineData(0)]
    [InlineData(50)]
    [InlineData(1000)]
    public async Task EnqueueAsync_RespectsMaxBatchSize(int batchSize)
    {
        // ...
    }
}
```

## Formatting

Use `.editorconfig` for code style. Key rules: 4-space indentation, `var` when type is apparent, file-scoped namespaces, braces on new line (Allman style).

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
