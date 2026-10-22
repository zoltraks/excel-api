# C# Source Layout Reorganization - Implementation Plan

**Change Request Reference**

`docs/change/0.0.3/csharp-source-layout-reorganization.md`

**Best Practices**

- `docs/standard/csharp-aspnet-development.md`
- `docs/REFACTORING.md` - formal proposal in `docs/refactoring/0.0.3/CSHARP_PROPOSAL.md`

**Documentation Updates**

- `docs/SPECIFICATION.md` - the C# "Source layout" block, updated before code changes.
- `excel-api-csharp/README.md` - the test-directory path in the test command.

**Step by Step Implementation**

**Rename folders and move files**

`git mv` the folders `Auth/` to `Security/`, `Config/` to `Options/`, `Dto/` to `Contracts/`. Move `Excel/WorkbookConfig.cs` to `Options/`, `Excel/SheetLayout.cs` to `Services/`, `Services/MetricsCollector.cs` to `Metrics/`, `Util/DurationParser.cs` to `Options/`, and `appsettings.json.example` to `config/appsettings.example.json`. The `Excel/` and `Util/` directories dissolve, leaving `Program.cs` and `ExcelApi.csproj` alone at the project root.

**Rename settings classes**

Rename `AccessConfig`, `AuthConfig`, `LoggingConfig`, `QueueConfig`, `RateLimitConfig`, `ServerConfig`, `WorkbookConfig` to their `*Options` forms, and `ConfigLoader` to `OptionsLoader`, `ConfigPathResolver` to `OptionsPathResolver` - file names and type names together, with every reference updated.

**Update namespaces and usings**

Each moved file declares its new namespace (`BigBytes.ExcelApi.Options`, `.Security`, `.Contracts`, `.Metrics`, and the root `BigBytes.ExcelApi` for `DurationParser`). Every `using` line is updated: `.Config` to `.Options`, `.Auth` to `.Security`, `.Dto` to `.Contracts`, `.Util` removed, and `.Excel` resolved per file - `.Options` where `WorkbookOptions` is used, deleted in `ExcelService` where `SheetLayout` becomes a sibling type.

**Move and mirror the test project**

`git mv src/ExcelApi.Test tests/ExcelApi.Tests`, rename the csproj to `ExcelApi.Tests.csproj`, repoint `ProjectReference` to `..\..\src\ExcelApi\ExcelApi.csproj`, place each test file under its mirrored folder (`Options/`, `Services/`, `Logging/`, root), rename files and classes `*Test` to `*Tests`, and declare `ExcelApi.Tests.<folder>` namespaces.

**Update solution file**

Point `ExcelApi.sln` at `tests\ExcelApi.Tests\ExcelApi.Tests.csproj` under the new project name.

**Testing Strategy**

The existing MSTest suite must pass with the same test count - the suite verifies the rename correctness. No new tests: the change is reorganization only. Missing coverage for `Endpoints`, `Security`, `FileLockService`, `WriteQueueService`, and `MetricsCollector` is a recorded gap, not part of this change.

**Verification**

Verification loop per `docs/TESTING.md`: `dotnet build`, `dotnet format --verify-no-changes`, `dotnet test`, `dotnet publish -c Release`, with zero warnings. Security gate: `dotnet list package --vulnerable` plus manual review of the moved file-handling code.
