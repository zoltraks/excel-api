# CORS Allowlist

**Type**: Feature

**Summary**: CORS is maximally permissive in Node (`origin: true`) and C# (any origin/method/header), and self-contradictory in Java (wildcard origin plus credentials, rejected by Spring at request time). Add a configurable origin allowlist applied consistently in all three servers.

**Description**:

Audit finding FND-SEC-006 / recommendation REC-016.

- Add `server.cors.allowed_origins` (list) to the configuration schema in all three servers; Java's existing `CorsConfig.allowedOrigins` field becomes the bound value.
- Node: replace `origin: true` with the configured list (or deny cross-origin when the list is empty).
- C#: constrain the CORS policy to the configured origins instead of allow-any.
- Java: drop the `*` + `allowCredentials(true)` combination; apply the configured origins with credentials only when origins are explicit.
- Update `config.example.yaml` in each component with a documented default (e.g., disabled or explicit localhost).
- Preflight from a non-allowlisted origin must be rejected; allowlisted origins must succeed.

## Out of Scope

- Dynamic origin patterns/regex support.
