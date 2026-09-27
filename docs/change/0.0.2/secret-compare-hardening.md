# Secret Compare Hardening

**Type**: Fix

**Summary**: `client_secret` and static tokens are compared with early-exit string equality, leaking byte-position timing. Switch all credential comparisons to constant-time primitives. Plaintext storage in `access.yaml` is retained as an accepted posture (file is `0600`-protected and never committed).

**Description**:

Audit finding FND-SEC-005 / recommendation REC-015 — applied partially per decision: hashing storage is deferred, comparison hardening is in scope.

- Node: `crypto.timingSafeEqual` for `client_secret` and `tokens.static[].token` comparisons (length-check or pad before compare).
- Java: `MessageDigest.isEqual` for the same comparisons.
- C#: constant-time comparison (`CryptographicOperations.FixedTimeEquals` or equivalent).
- bcrypt user-password verification is already correct in Node and lands in Java/C# via their auth changes — no change needed there.
- Document in `docs/ARCHITECTURE.md` or `docs/DEPLOYMENT.md` that `access.yaml` holds plaintext secrets by design, is git-ignored, and requires `0600` permissions — the loaders already warn.

## Out of Scope

- Hashed storage of secrets (deferred decision).
- Secret rotation tooling.
