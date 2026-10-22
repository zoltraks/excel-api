# C# Refactoring Proposal - Source Layout Reorganization

**Problem**

The `excel-api-csharp` tree carries Java naming vocabulary: `Config/`, `Dto/`, `Util/`, `Auth/` are abbreviated or singular categories where .NET conventions prefer spelled-out plurals (`Options`, `Contracts`, `Security`). Bound settings classes lack the `Options` suffix the Options pattern expects, and settings types sit beside the loader types with near-identical names (`ConfigLoader`, `ConfigPathResolver`). The `Excel/` folder holds only two files and duplicates the application's name. `appsettings.json.example` sits inside the project folder where the Web SDK globs `*.json` as publishable content. The test project is flat, does not mirror sources, and declares two different namespaces (`ExcelApi.Test` and `ExcelApi.Tests`).

**Goal**

A layered tree under `BigBytes.ExcelApi` with folders named for their role: `Options/` (settings + loader), `Security/`, `Endpoints/`, `Contracts/`, `Services/`, `Metrics/`, `Logging/`, `Resources/`, plus `Program.cs` and `DurationParser.cs` at the root. A `tests/ExcelApi.Tests/` project mirroring the folders with `*Tests` names and `ExcelApi.Tests.<folder>` namespaces. Behavior unchanged.

**Plan**

1. Update `docs/SPECIFICATION.md` source-layout block and `excel-api-csharp/README.md` test path.
2. `git mv` folder renames and file moves (`Auth/` to `Security/`, `Config/` to `Options/`, `Dto/` to `Contracts/`, dissolve `Excel/` and `Util/`, `MetricsCollector` to `Metrics/`, example file to `config/`).
3. Rename settings classes `*Config` to `*Options` and loader classes to `Options*` names, updating all references.
4. Update every namespace declaration and `using` line to the new namespaces.
5. Move and mirror the test project, repoint its `ProjectReference`, and update `ExcelApi.sln`.
6. Run the verification loop (`dotnet build`, `dotnet format --verify-no-changes`, `dotnet test`, `dotnet publish -c Release`).

**Risk**

A missed `using` or stale namespace breaks compilation - the build catches it immediately. Endpoint delegate signatures take config types by parameter, so a missed rename breaks `Program.cs` wiring. The `appsettings.json.example` move affects only example documentation, not runtime config. Unit tests cover `OptionsLoader`, `WorkbookOptions`, `SheetLayout`, `DurationParser`, `ExcelService`, and the loggers - the renamed surface is exercised except `Endpoints`/`Security` (recorded coverage gap).

**Acceptance Criteria**

- `dotnet build` and `dotnet test` pass with zero errors and zero warnings.
- Folder names match declared namespaces (IDE0130 clean).
- No file or folder keeps a `Config`/`Dto`/`Util`/`Auth` name outside history.
- `config/appsettings.example.json` exists at the module root and the project folder holds no `*.json` example.
- `tests/ExcelApi.Tests/` mirrors `src/ExcelApi/` folders with `*Tests` classes.
- `docs/SPECIFICATION.md` and `README.md` reflect the final tree.
