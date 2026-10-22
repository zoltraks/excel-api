# C# Source Layout Reorganization

**Type**: Refactor

**Summary**

Reorganize the `excel-api-csharp` source tree to the .NET layered convention: folders and namespaces named for their role, bound settings classes carrying the `Options` suffix, and a mirrored MSTest project under `tests/`.

**Description**

The C# implementation complies with the SDK-style project model, but its folder and class names carry over Java vocabulary (`Config`, `Dto`, `Util`, `Auth`) where .NET conventions prefer spelled-out, plural category names and the Options pattern for bound settings. The test project is flat, splits `*Test` naming inconsistently (`ExcelApi.Test` vs `ExcelApi.Tests` namespaces), and does not mirror the source tree.

Reorganization requirements:

- Rename `Config/` to `Options/`, renaming the bound settings classes `*Config` to `*Options` and the loading types `ConfigLoader` to `OptionsLoader` and `ConfigPathResolver` to `OptionsPathResolver`.
- Dissolve `Excel/`: `WorkbookConfig` becomes `Options/WorkbookOptions`, `SheetLayout` moves to `Services/`.
- Rename `Dto/` to `Contracts/` and `Auth/` to `Security/`, keeping the class names inside unchanged.
- Move `Services/MetricsCollector.cs` to `Metrics/`.
- Move `Util/DurationParser.cs` to `Options/` (it parses config option values; `Program.cs` is its sole caller); `Util/` dissolves and the project folder root keeps only `Program.cs` and the `.csproj`.
- Move `appsettings.json.example` out of the project folder to `config/appsettings.example.json`, since the Web SDK globs `*.json` inside a project as publishable content.
- Move `src/ExcelApi.Test/` to `tests/ExcelApi.Tests/`, mirror the source folders, rename files and classes `*Test` to `*Tests`, and declare `ExcelApi.Tests.<folder>` namespaces.
- Update `ExcelApi.sln`, the test project `ProjectReference`, `README.md`, and `docs/SPECIFICATION.md`.

Behavior must not change: same endpoints, same configuration keys, same log format, same embedded OpenAPI resource.

**Out of Scope**

- Renaming the `AuthMiddleware`, `AuthService`, or `JwtService` classes.
- Changes to the Node, Java, or Go implementations or the integration suite.
- Version bump or CHANGELOG update.
