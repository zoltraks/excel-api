# C# Authentication and Authorization

**Type**: Feature

**Summary**: The C# server has no authentication: `access.yaml` is never loaded, the token endpoint returns a `dummy-token` for a hardcoded client pair and accepts any password grant, and every data endpoint is anonymously callable. Implement the full contract auth pipeline: Bearer JWT validation, `Token` static credentials, and scope/ACL enforcement per endpoint.

**Description**:

Audit finding FND-SEC-001 / recommendation REC-001. Highest-impact change in the repository.

- Load `access.yaml` through the existing `AccessConfig` loader path (`--access` flag, `ACCESS` env var).
- `POST /auth/token` must implement the contract grants: `client_credentials` (verify `client_id`/`client_secret` against `access.yaml`), `password` (verify against bcrypt `password_hash` via BCrypt.Net), and issue real JWTs signed with the configured secret with contract claims (scopes, expiry).
- Bearer authentication must validate JWT signature, expiry, and issuer per `auth.jwt` configuration.
- `Authorization: Token <value>` must validate against `tokens.static` entries and apply their declared scopes.
- All endpoints except `GET /health`, `GET /openapi.yaml`, `GET /openapi.json`, and `POST /auth/token` must require authentication.
- Scope enforcement per endpoint: `read` for GET endpoints, `write` for PUT/POST/DELETE, `admin` for lock-status per the ACL rules in `access.yaml`.
- Scope violations return 403 with the contract error envelope; missing/invalid credentials return 401.
- The hardcoded `test-client`/`test-secret` acceptance and `dummy-token` responses must be removed.
- Test fixtures in `excel-api-test/config/access.test.yaml` define the working credentials (test-client/test-secret, testuser/testpass bcrypt hash, static tokens).

## Out of Scope

- Rate limiting on the token endpoint (`rate-limiting` change).
- Constant-time secret comparison (`secret-compare-hardening` change).
