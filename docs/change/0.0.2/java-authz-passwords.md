# Java Authorization and Password Verification

**Type**: Fix

**Summary**: The Java server authenticates but never authorizes — any valid token reaches write and admin endpoints — and the password grant compares the stored `password_hash` field to plaintext via `String.equals`. Enforce ACL scope rules per endpoint and verify password grants against bcrypt hashes.

**Description**:

Audit findings FND-SEC-003 and FND-SEC-002 / recommendations REC-002 and REC-003.

- Evaluate `access.yaml` `acl.rules` against the authenticated principal's scopes per endpoint: `read` for GET, `write` for PUT/POST/DELETE, and `admin` (or the `admin_endpoints` rule) for lock-status.
- Scope violations return 403 with the contract error envelope.
- `validateUser` in `AuthController` must verify the submitted password with `PasswordEncoder`/`BCrypt` against the stored hash (`spring-security-crypto` is already a dependency) and return RFC-6749 `invalid_grant` on mismatch.
- Non-hash `password_hash` values must be rejected (never silently treated as plaintext).
- The existing static-token and JWT filters keep working; granted authorities from scopes must be consumed by the authorization decision.

## Out of Scope

- Secret hashing at rest in `access.yaml` (`secret-compare-hardening`).
- Rate limiting (`rate-limiting`).
