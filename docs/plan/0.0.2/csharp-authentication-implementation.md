# C# Authentication and Authorization — Implementation Plan

**Change Request Reference**: `docs/change/0.0.2/csharp-authentication.md`

**Best Practices**: `docs/standard/csharp-aspnet-development.md` (Minimal API, primary constructors, DI). Reference implementation: Node `src/auth/` and Java `security/` filters.

**Documentation Updates**: `docs/SPECIFICATION.md` C# section — auth middleware and access.yaml loading now exist; `docs/ARCHITECTURE.md` authorization flow already describes the target.

**Step by Step Implementation**:

1. **Load access.yaml**
   - Wire `AccessPath`/`ACCESS` env/`--access` flag through `ConfigLoader` into a bound `AccessConfig`; fail startup on missing/invalid file when auth is enabled.
   - Files: `excel-api-csharp/src/ExcelApi/Config/ConfigLoader.cs`, `Program.cs`, `Config/AccessConfig.cs`.

2. **Real token endpoint**
   - `AuthEndpoints.cs`: implement `client_credentials` (verify id/secret against `access.yaml` clients), `password` grant (BCrypt.Net `BCrypt.Verify` against `password_hash`), issue JWT (HS256, issuer/expiry/scopes per `auth.jwt` config and access.yaml scopes). Remove hardcoded pair and `dummy-token`.
   - Files: `Endpoints/AuthEndpoints.cs`, new `Services/TokenService.cs` (or `Auth/JwtService.cs`).

3. **Authentication middleware**
   - Register `UseAuthentication`/`UseAuthorization`; configure `JwtBearer` with the configured secret; add a `Token <value>` static-token scheme handler resolving scopes from `access.yaml`.
   - Files: `Program.cs`, new `Auth/` handlers.

4. **Endpoint authorization**
   - Apply `RequireAuthorization` on all data endpoints; public: `/health`, `/openapi.yaml`, `/openapi.json`, `/auth/token`.
   - Scope policy: GET→`read`, PUT/POST/DELETE→`write`, lock-status→`admin` per `acl.rules`/`admin_endpoints`.
   - Files: `Endpoints/*.cs`, `Program.cs`.

5. **Error envelope on 401/403**
   - Map unauthorized/forbidden to the contract `{error, message}` envelope.

**Testing Strategy**: MSTest unit tests for token verification, scope mapping, and static-token auth; integration coverage lands via `integration-test-suite` auth tests run against the C# image.

**Verification**: `docs/TESTING.md` loop on `excel-api-csharp` + security gate (auth change): `dotnet list package --vulnerable`, manual review of credential handling.
