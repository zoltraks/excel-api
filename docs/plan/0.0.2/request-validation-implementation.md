# Request Validation — Implementation Plan

**Change Request Reference**: `docs/change/0.0.2/request-validation.md`

**Best Practices**: `docs/standard/ts-node-development.md` (zod), `docs/standard/java-spring-maven-development.md`, `docs/standard/csharp-aspnet-development.md`.

**Documentation Updates**: None — contract already declares `INVALID_REQUEST`.

**Step by Step Implementation**:

1. **Node**
   - Validate write bodies (`value`, `data`, batch `operations`) at the route boundary — Fastify JSON schema or zod — mapping failures to `400 INVALID_REQUEST`.
   - Files: `excel-api-node/src/routes/*.ts`, possibly a shared validator module.

2. **Java**
   - Add validation on controller inputs (explicit guards or `jakarta.validation`); remove unchecked casts; `400 INVALID_REQUEST` on bad input.
   - Files: `excel-api-java/.../controller/*.java`, `GlobalExceptionHandler.java`.

3. **C#**
   - Model validation / explicit guards on endpoint handlers; `400 INVALID_REQUEST` on bad input.
   - Files: `excel-api-csharp/src/ExcelApi/Endpoints/*.cs`, `Dto/`.

**Testing Strategy**: Unit/integration: missing/mistyped body → 400 `INVALID_REQUEST` in all three servers.

**Verification**: `docs/TESTING.md` loop on all three servers.
