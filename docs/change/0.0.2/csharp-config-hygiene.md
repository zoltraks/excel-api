# C# Config Hygiene

**Type**: Fix

**Summary**: The C# server ignores loaded configuration: the listener is hardcoded to `http://0.0.0.0:8443`, file logging uses ad-hoc `LOGGING_FILE_*` env vars instead of `logging.file.*` config, `AccessPath` is parsed but never loaded, and `GetCellType` contains an unreachable duplicated return. Make configuration behave as documented.

**Description**:

Audit finding FND-CQY-006 / recommendation REC-025.

- Bind the listener to `serverConfig` host/port (`server.host`, `server.port`) instead of the hardcoded URL.
- Route file logging through the `logging.file` configuration schema; remove or reconcile the `LOGGING_FILE_*` env-var bypass.
- Consume the loaded `access.yaml` (landing with `csharp-authentication`) — ensure `AccessPath`/`ACCESS` resolution feeds the auth pipeline.
- Remove the unreachable duplicated `return` in `GetCellType`.
- Build clean with warnings-as-errors discipline (`dotnet build` zero warnings).
- A non-default `server.port` must change the bound socket.

## Out of Scope

- The authentication implementation itself (`csharp-authentication` change).
