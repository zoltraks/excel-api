# CORS Allowlist — Implementation Plan

**Change Request Reference**: `docs/change/0.0.2/cors-allowlist.md`

**Best Practices**: `docs/standard/ts-node-development.md`, `docs/standard/java-spring-maven-development.md`, `docs/standard/csharp-aspnet-development.md`.

**Documentation Updates**: `docs/SPECIFICATION.md` config schema per server (new `server.cors.allowed_origins`); `config.example.yaml` ×3.

**Step by Step Implementation**:

1. **Config schema**
   - Add `server.cors.allowed_origins` (list) to each loader; sensible default (deny or explicit localhost). Update `config.example.yaml` ×3.
   - Files: Node `src/config/loader.ts`, Java `config/ServerConfig.java` (existing `CorsConfig`), C# `Config/`.

2. **Node**
   - Replace `origin: true` with the configured allowlist (or disallow when empty).
   - Files: `excel-api-node/src/server.ts`.

3. **Java**
   - Fix `CorsFilterConfiguration`: apply configured origins; drop `*` + `allowCredentials(true)` combo.
   - Files: `excel-api-java/.../config/CorsFilterConfiguration.java`.

4. **C#**
   - Constrain the CORS policy to configured origins in `Program.cs`.
   - Files: `excel-api-csharp/src/ExcelApi/Program.cs`.

**Testing Strategy**: Config-loading unit tests; manual/compose preflight check per server.

**Verification**: `docs/TESTING.md` loop on all three servers + security gate (cross-origin policy).
