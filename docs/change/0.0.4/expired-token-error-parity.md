# Expired-Token Error Parity

## Type

Fix

## Summary

The three servers answer an expired JWT with different error codes. Node emits
`TOKEN_EXPIRED` while Java and C# fall back to the generic `UNAUTHORIZED`
envelope. The contract defines no `TOKEN_EXPIRED` code, so the observable
error vocabulary diverges.

## Coverage

All supported server implementations: Node (`excel-api-node`), Java
(`excel-api-java`), and C# (`excel-api-csharp`).

## Description

Current state, verified from source:

- `excel-api-node` carries an explicit `TOKEN_EXPIRED` error code in
  `src/auth/middleware.ts` and `src/auth/jwt.ts` and returns it when a bearer
  token is expired.
- `excel-api-java` and `excel-api-csharp` validate expiry through their JWT
  libraries and answer with the generic `UNAUTHORIZED` envelope - no
  `TOKEN_EXPIRED` code exists in either implementation.
- `docs/contract/openapi.yaml` defines no `TOKEN_EXPIRED` code.

Behavioral requirements:

- All three servers emit the same error code for an expired token, so a client
  cannot tell implementations apart.
- One direction must be picked and recorded: either the contract gains
  `TOKEN_EXPIRED` and Java and C# emit it, or Node aligns to the generic
  `UNAUTHORIZED` envelope defined by the contract.
- If the contract gains the code, `docs/contract/openapi.yaml` documents it on
  the token-related error responses and `shell/sync-openapi.sh` propagates it.
- If the code is dropped, `excel-api-go` behavior against the removed code is
  checked - the CLI's re-authentication path on `401` must keep working.
- `excel-api-test` gains a parity assertion for the expired-token response
  shape across all three servers where practical.

## Out of Scope

- JWT issuance, refresh, or expiry-duration changes.
- The remaining error-code surface - verified matching in this audit.
