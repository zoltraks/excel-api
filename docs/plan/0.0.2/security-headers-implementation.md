# Security Headers — Implementation Plan

**Change Request Reference**: `docs/change/0.0.2/security-headers.md`

**Best Practices**: `docs/standard/ts-node-development.md`, `docs/standard/java-spring-maven-development.md`, `docs/standard/csharp-aspnet-development.md`.

**Documentation Updates**: None — baseline hardening, no doc surface changes required.

**Step by Step Implementation**:

1. **Node**
   - Fastify `onSend` hook (or `@fastify/helmet`-equivalent minimal manual set) emitting `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer`.
   - Files: `excel-api-node/src/server.ts`.

2. **Java**
   - A servlet filter or `SecurityFilterChain` headers config emitting the same set.
   - Files: `excel-api-java/.../config/WebSecurityConfig.java` or a new filter.

3. **C#**
   - Middleware setting the same headers on every response.
   - Files: `excel-api-csharp/src/ExcelApi/Program.cs`.

**Testing Strategy**: Verify headers present on `/health`, a data endpoint, and `/openapi.yaml` per server.

**Verification**: `docs/TESTING.md` loop on all three servers + security gate (header hardening).
