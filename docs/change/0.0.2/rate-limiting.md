# Rate Limiting

**Type**: Feature

**Summary**: `/auth/token` accepts unlimited attempts and all data endpoints are unthrottled, leaving brute force and resource exhaustion unbounded. Add rate limiting on the token endpoint and a global request throttle with a documented 429 response.

**Description**:

Audit finding FND-SEC-007 / recommendation REC-017.

- Per-IP (or per-subject) limiter on `POST /auth/token` in all three servers.
- A global request throttle on the remaining endpoints at a generous default.
- Limits configurable via the config schema (e.g., `rate_limit.token_per_minute`, `rate_limit.requests_per_minute`), documented in `config.example.yaml`.
- Responses over the limit return `429` with the contract error envelope (`RATE_LIMITED` or the contract's declared code — align with `docs/contract/openapi.yaml`; add the code to the contract if missing, then re-sync).
- Prefer framework/stdlib primitives; new dependencies only when justified under `docs/COPYRIGHTS.md`.
- Accept: repeated failed token attempts produce 429 after the configured threshold.

## Out of Scope

- Distributed rate limiting across replicas (single-node constraint per `docs/ARCHITECTURE.md`).
