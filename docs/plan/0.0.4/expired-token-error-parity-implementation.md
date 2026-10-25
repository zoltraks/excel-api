# Expired-Token Error Parity - Implementation

## Change Request Reference

`docs/change/0.0.4/expired-token-error-parity.md`

## Best Practices

- `docs/standard/typescript-fastify-development.md`, `java-spring-development.md`,
  `csharp-aspnet-development.md` - error envelope conventions.
- `docs/contract/openapi.yaml` - error response shape.

## Documentation Updates

- `docs/contract/openapi.yaml` - document `TOKEN_EXPIRED` on the auth-related
  error responses; sync via `shell/sync-openapi.sh`.
- `docs/SPECIFICATION.md` - error-code tables per implementation where present.

## Steps

**Step 1 - Contract**

Add `TOKEN_EXPIRED` to the error-code surface in
`docs/contract/openapi.yaml` on protected-endpoint 401 responses; propagate
with `shell/sync-openapi.sh`.

**Step 2 - Java**

In the JWT validation path, map an expired-token failure to the
`TOKEN_EXPIRED` error code instead of `UNAUTHORIZED`.

**Step 3 - C#**

In `JwtService`/authentication middleware, map token-expiry validation failure
to `TOKEN_EXPIRED`.

**Step 4 - Go CLI check**

Verify the CLI's re-authentication on `401` still triggers - it keys off
status code, not the error code.

## Testing Strategy

Per-implementation unit test asserting expired JWT yields 401 with
`TOKEN_EXPIRED`; integration-level check where the harness supports token
fixturing.

## Verification

`npm test -- --run`, `mvn test`, `dotnet test`, `go test ./...` - all green;
manual expired-token probe per implementation where practical.
