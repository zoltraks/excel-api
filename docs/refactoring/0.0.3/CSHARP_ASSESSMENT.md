# C# Refactoring Assessment - Source Layout Reorganization

Assessment of the completed refactoring per `docs/refactoring/0.0.3/CSHARP_PROPOSAL.md`.

**Result**

The tree now matches the proposed layout: `Options/` holds all bound settings with `*Options` names plus `OptionsLoader` and `OptionsPathResolver`, `Security/` holds the auth components, `Contracts/` holds the request/response types, `Metrics/` holds `MetricsCollector`, `SheetLayout` moved into `Services/`, `DurationParser` moved into `Options/` (it parses config option values for its sole caller `Program.cs`), and `Excel/` plus `Util/` are dissolved - the project root holds only `Program.cs` and `ExcelApi.csproj`. `appsettings.json.example` moved to `config/appsettings.example.json`. The test project lives at `tests/ExcelApi.Tests/` with folders mirroring the source, `*Tests` names, and `ExcelApi.Tests.<folder>` namespaces.

**Evaluation checklist**

- Unit tests: `dotnet test` — 29 passed, 0 failed. Passed.
- Integration tests: Not Run - behavior-preserving rename only, the container suite was unchanged.
- Linting: `dotnet format --verify-no-changes` clean, `dotnet build` zero errors and zero warnings. Passed.
- Standard consistency: layout now follows `docs/standard/csharp-aspnet-development.md` folder conventions. Passed.
- Dependencies: none added. Passed.
- Performance: rename and move only, no measurable effect. Passed.
- Documentation: `docs/SPECIFICATION.md` source-layout block, `docs/PROJECT.md` test location, and `excel-api-csharp/README.md` test command updated. Passed.

**Deviations and notes**

- Two pre-existing build problems blocked baseline verification and were fixed: `CellEndpoints.cs` missed `using System.Text.Json;` (CS1061 on `JsonNode.Deserialize`), and `ExcelService.cs` had a CS8601 warning on `cell.Address.ToString()` (resolved with `?? ""` per the standard's null-handling rule, which prefers `??` over bare `!`).
- The engineering standard was found stale during review and updated: `docs/standard/csharp-aspnet-development.md` now documents the real tree, the `Options`/`OptionsLoader` names, the mirrored `ExcelApi.Tests.<folder>` namespaces, the `SemaphoreSlim` lane mechanism, the real `Program.cs` startup order, and MSTest attributes (its example previously showed xUnit).
- `JsonLogFormatTest` renamed to `JsonLogFormatTests` only: it asserts the JSON log-entry field contract rather than exercising a specific class, so the format name is the accurate one.
- Nested settings types inside `Options/` files (`OAuth2Config`, `TokensConfig`, `AclConfig`, `LifecycleConfig`, `SheetHeaderConfig`, `LoggingFileConfig`, `JwtIssuerConfig`, `ServerTlsConfig`, `ServerCorsConfig`) keep their `*Config` names - the proposal covered top-level classes only, and a uniform internal style is accepted.
- `SheetLayoutTests` used `SheetHeaderConfig`, so it carries both `Services` and `Options` usings.
- Root namespace `BigBytes.ExcelApi` already carried a company prefix - no change needed.
- `Program.cs` keeps its inline `Use(...)` pipeline middleware (composition-root wiring, not handlers) at 299 lines - worth a separate look if it grows.
- Test run needed `DOTNET_ROLL_FORWARD=LatestMajor` because only the .NET 10 runtime is installed while the project targets `net8.0`.

**Coverage gap (recorded, unchanged)**

No tests exercise `Endpoints`, `Security`, `FileLockService`, `WriteQueueService`, or `MetricsCollector` - pre-existing, outside this change's scope.
