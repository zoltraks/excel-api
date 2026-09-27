# Security Headers

**Type**: Feature

**Summary**: No server emits baseline HTTP security headers. Add a minimal hardening set to all three servers as defense-in-depth.

**Description**:

Audit finding FND-SEC-009 / recommendation REC-028.

- Emit `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, and `Referrer-Policy: no-referrer` on all responses in Node, Java, and C#.
- Apply via the framework's middleware/hook mechanism (Fastify `onSend`, servlet filter, ASP.NET middleware).
- Verify headers appear on representative endpoints (`/health`, a data endpoint, `/openapi.yaml`).

## Out of Scope

- CSP/HSTS (JSON-only API; not applicable per audit rationale).
