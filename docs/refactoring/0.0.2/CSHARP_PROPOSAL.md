# C# Refactoring Proposal

## Problem

The C# implementation has a monolithic entry point and a flat, inconsistent file layout that violates `docs/standard/csharp-aspnet-development.md`.

- `excel-api-csharp/src/ExcelApi/Program.cs` is ~17 KB and contains: CORS setup, file-logging middleware, argument parsing, auth token issuance, and every API endpoint as inline lambdas. All 19+ endpoints are registered with `app.MapGet/MapPost/MapPut/MapDelete` in one place.
- **Flat root structure**: `ExcelService.cs`, `WorkbookConfig.cs`, and `RotatingFileLogger.cs` live at the project root instead of under dedicated namespaces and folders. Other files already use subdirectories (`Config/`, `Logging/`, `Util/`), so the layout is inconsistent.
- **`dynamic` parameters**: endpoint handlers such as `MapPut(".../cells/{cellRef}", (..., dynamic request) => ...)`, `MapPost(".../records", (..., dynamic request) => ...)`, and `MapPut(".../records/{recordIndex}", ...)` accept `dynamic` request bodies. This defeats compile-time checking, violates the standard's strict-typing rule, and produces brittle code prone to runtime errors.
- **God service**: `ExcelService.cs` is ~15 KB and handles workbook listing, sheet inspection, cell read/write, record CRUD, range reads, and batch operations.
- **Duplicate / stale config**: `ConfigLoader.cs` contains parallel branches for parsing configs with and without a `registry` section, including renamed local variables (`directConfig`, `directWbConfig`) as noted in earlier work. Lifecycle resolution logic is duplicated in multiple places.
- **No typed endpoint routing**: Minimal API lambdas are not testable in isolation.

## Goal

- Move endpoint registrations out of `Program.cs` into per-resource endpoint classes under an `Endpoints/` folder using the extension-method pattern (`EndpointRouteBuilderExtensions`).
- Introduce service classes per resource: `WorkbookService`, `SheetService`, `CellService`, `RecordService`, `BatchOperationsService`, all registered via DI.
- Replace every `dynamic` parameter with strongly typed DTOs under `Dto/` (`WriteCellRequest`, `AddRecordRequest`, `UpdateRecordRequest`, `BatchOperationsRequest`, etc.).
- Organize source under a consistent folder structure:
  - `Endpoints/` (extension methods registering groups of endpoints)
  - `Services/` (`ExcelService` split; `AuthService`)
  - `Config/` (loaders and POCO config classes)
  - `Dto/` (request and response models)
  - `Excel/` (`WorkbookConfig`, Excel helpers)
  - `Logging/` (existing + `RotatingFileLogger`)
  - `Middleware/` (CORS + file logging extracted)
- Consolidate duplicated lifecycle-resolution logic into one helper.
- `Program.cs` reduced to: configuration load, DI registration, middleware setup, endpoint group registration, application run. Target size: under 150 lines.

## Plan

**Step 1 — Relocate flat files**

- Move `ExcelService.cs` to `Services/ExcelService.cs` (namespace `BigBytes.ExcelApi.Services`).
- Move `WorkbookConfig.cs` to `Excel/WorkbookConfig.cs` (namespace `BigBytes.ExcelApi.Excel`).
- Move `RotatingFileLogger.cs` to `Logging/RotatingFileLogger.cs` (namespace `BigBytes.ExcelApi.Logging`).
- Update all `using` statements. Run `dotnet build` and `dotnet test`.

**Step 2 — Introduce typed request DTOs**

- Create `Dto/WriteCellRequest.cs`, `Dto/AddRecordRequest.cs`, `Dto/UpdateRecordRequest.cs`, `Dto/BatchOperationsRequest.cs`, and any other needed models.
- Replace every `dynamic` parameter in endpoint lambdas with the appropriate DTO type.
- Run `dotnet build`, `dotnet format --verify-no-changes`, `dotnet test`.

**Step 3 — Extract middleware**

- Move file-logging middleware lambda from `Program.cs` into `Middleware/FileLoggingMiddleware.cs`.
- Move CORS configuration into an extension method in `Middleware/CorsExtensions.cs`.
- Update `Program.cs` to call the extensions.

**Step 4 — Extract endpoints per resource**

For each group, in order: health/metrics, openapi, auth, workbooks, sheets, columns, cells, records, operations, lock-status. For each:

- Create `Endpoints/<Resource>Endpoints.cs` with an extension method `MapXxxEndpoints(this IEndpointRouteBuilder)`.
- Move the `app.MapGet/Post/...` calls verbatim into the extension.
- In `Program.cs`, replace the inline calls with `app.MapXxxEndpoints()`.
- Build and test after each extraction.

**Step 5 — Split ExcelService**

- Create per-resource services (`WorkbookService`, `SheetService`, `CellService`, `RecordService`, `BatchOperationsService`), register in DI.
- Update endpoint extension classes to depend on the services via constructor/parameter injection.
- Migrate logic out of `ExcelService`. Delete `ExcelService` once empty, or keep as a thin facade.
- Update `ExcelApi.Test` accordingly.

**Step 6 — Consolidate lifecycle resolution**

- Extract CLI > env > config lifecycle-resolution code into `Config/LifecycleResolver.cs`.
- Remove duplicate branches from `ConfigLoader`.
- Update `ConfigLoaderTest` accordingly.

**Step 7 — Auth extraction**

- Move `/auth/token` logic into `Services/AuthService.cs` used by a slim `Endpoints/AuthEndpoints.cs`.
- Add `AuthServiceTest`.

**Step 8 — Verification**

- `dotnet build` clean.
- `dotnet format --verify-no-changes` clean.
- `dotnet test` passes.
- Runtime with `--life 60s` plus Go CLI listing workbooks.
- Integration tests in `excel-api-test/`.

## Risk

- **DI wiring**: Endpoints currently capture closures. Moving to DI-injected services must ensure lifetimes (`AddSingleton` vs `AddScoped`) match current behavior for the workbook cache and queue.
- **DTO binding**: Minimal API binds query, route, header, and body parameters based on source. Model binding changes may alter status codes for malformed bodies (400 vs 415). Keep the current error envelope.
- **File locking on rebuild**: `ExcelApi.exe` frequently locks the output directory during test runs (already observed). The plan does not address this, but the existing taskkill workflow must remain usable.
- **Namespace renames**: Moving files changes type namespaces and may break `using` directives across the test project.

## Acceptance Criteria

- No files remain at `src/ExcelApi/` root other than `Program.cs`, `ExcelApi.csproj`, `appsettings.json.example`.
- `Program.cs` is under 150 lines.
- Zero `dynamic` parameters in endpoint handlers.
- All endpoints live in `Endpoints/*Endpoints.cs` extension classes.
- `ExcelService.cs` deleted or reduced to a facade under 3 KB.
- `dotnet build` produces no errors or warnings.
- `dotnet format --verify-no-changes` passes.
- `dotnet test` passes all existing and new tests.
- Runtime verification with `--life 60s` and Go CLI succeeds.
- Integration tests pass.
