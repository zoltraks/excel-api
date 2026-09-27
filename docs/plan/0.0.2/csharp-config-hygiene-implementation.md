# C# Config Hygiene — Implementation Plan

**Change Request Reference**: `docs/change/0.0.2/csharp-config-hygiene.md`

**Best Practices**: `docs/standard/csharp-aspnet-development.md` (config loading, DI).

**Documentation Updates**: `docs/SPECIFICATION.md` C# section (config surfaces actually consumed).

**Step by Step Implementation**:

1. **Bind listener to config**
   - `app.Run` binds `serverConfig.Host`/`serverConfig.Port` instead of hardcoded `http://0.0.0.0:8443`.
   - Files: `excel-api-csharp/src/ExcelApi/Program.cs`.

2. **File logging via config**
   - Route file logging through `logging.file.*` schema fields; remove/reconcile the `LOGGING_FILE_*` env bypass.
   - Files: `Program.cs`, `Config/` loader + `config.example.yaml`.

3. **Consume access.yaml**
   - Ensure `AccessPath`/`ACCESS`/`--access` loads `access.yaml` into `AccessConfig` (completes `csharp-authentication`'s wiring if not already done there).
   - Files: `Config/ConfigLoader.cs`, `Program.cs`.

4. **Dead branch removal**
   - Remove the unreachable duplicated `return` in `GetCellType`.
   - Files: `excel-api-csharp/src/ExcelApi/Services/ExcelService.cs`.

**Testing Strategy**: MSTest on config binding; runtime check that a non-default port binds.

**Verification**: `docs/TESTING.md` loop on `excel-api-csharp` (warnings-as-errors clean).
