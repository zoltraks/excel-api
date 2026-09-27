# Rate Limiting — Implementation Plan

**Change Request Reference**: `docs/change/0.0.2/rate-limiting.md`

**Best Practices**: `docs/standard/ts-node-development.md`, `docs/standard/java-spring-maven-development.md`, `docs/standard/csharp-aspnet-development.md`.

**Documentation Updates**: `docs/SPECIFICATION.md` config sections (`rate_limit.*`); `docs/contract/openapi.yaml` if a `429`/`RATE_LIMITED` error isn't declared (add, then `shell/sync-openapi.sh`); `config.example.yaml` ×3.

**Step by Step Implementation**:

1. **Contract**
   - Ensure `429` + `RATE_LIMITED` error is declared; add and re-sync if missing.
   - Files: `docs/contract/openapi.yaml`, synced copies.

2. **Config**
   - Add `rate_limit.token_per_minute` and `rate_limit.requests_per_minute` (or equivalent) to loaders + example configs.
   - Files: config loaders ×3, `config.example.yaml` ×3.

3. **Node**
   - Token-bucket/fixed-window limiter on `/auth/token` and a global throttle (stdlib counter or `@fastify/rate-limit` if a dependency is justified).
   - Files: `excel-api-node/src/server.ts`, new `src/ratelimit/` or middleware.

4. **Java**
   - A servlet filter implementing a per-IP/per-subject window counter on `/auth/token` + global limit.
   - Files: `excel-api-java/.../security/` or `config/`.

5. **C#**
   - ASP.NET `AddRateLimiter` middleware with partitioned limiter (token endpoint stricter, global throttle).
   - Files: `excel-api-csharp/src/ExcelApi/Program.cs`.

**Testing Strategy**: Unit test the limiter logic; compose check that N+1 token attempts return 429.

**Verification**: `docs/TESTING.md` loop on all three servers + security gate (DoS/auth surface).
