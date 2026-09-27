# Secret Compare Hardening — Implementation Plan

**Change Request Reference**: `docs/change/0.0.2/secret-compare-hardening.md`

**Best Practices**: `docs/standard/ts-node-development.md`, `docs/standard/java-spring-maven-development.md`, `docs/standard/csharp-aspnet-development.md` (security sections).

**Documentation Updates**: `docs/ARCHITECTURE.md` or `docs/DEPLOYMENT.md` — note plaintext-secret-at-0600 accepted posture.

**Step by Step Implementation**:

1. **Node: timing-safe compare**
   - `crypto.timingSafeEqual` for `client_secret` and `tokens.static[].token` checks (length-normalize before compare to avoid throw).
   - Files: `excel-api-node/src/auth/jwt.ts`, `src/auth/middleware.ts` (or wherever secrets are compared).

2. **Java: `MessageDigest.isEqual`**
   - Replace `.equals` on secret/token comparison paths in `AuthController` and any static-token filter.
   - Files: `excel-api-java/.../controller/AuthController.java`, `security/` filters.

3. **C#: fixed-time compare**
   - `CryptographicOperations.FixedTimeEquals` on client-secret and static-token checks (lands inside `csharp-authentication`'s auth code — apply as part of that implementation or here if already merged).
   - Files: `excel-api-csharp/src/ExcelApi/Auth/`, `Endpoints/AuthEndpoints.cs`.

4. **Docs**
   - Record the plaintext-at-rest accepted posture + 0600 requirement.

**Testing Strategy**: Unit test that correct/incorrect secrets still verify/fail identically (behavior-preserving hardening).

**Verification**: `docs/TESTING.md` loop on touched servers + security gate (credential handling).
