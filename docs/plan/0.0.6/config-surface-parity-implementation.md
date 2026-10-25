# Implementation Plan - Configuration Surface Parity

## Change Request Reference

`docs/change/0.0.6/config-surface-parity.md`

## Best Practices

- `docs/standard/java-spring-development.md`
- `docs/standard/csharp-aspnet-development.md`
- `docs/standard/rust-general-development.md` and `docs/standard/rust-api-development.md`

## Documentation Updates

- `docs/SPECIFICATION.md` - lenient `/auth/token` content-type superset, profile semantics
- `docs/ARCHITECTURE.md` - configuration resolution if behavior notes change

## Step by Step Implementation

**Profiles in Java.** Apply the top-level `profiles:` map selected by `CONFIG_PROFILE` in `ConfigurationLoader`, deep-merging the profile over the base config and stripping `profiles` (Node merge semantics). The `server.profiles` binding on `ServerConfiguration` is the wrong level - remove or repurpose it.

**Profiles in C#.** Same semantics in `OptionsLoader`.

**Java listener binding.** Wire `server.port`, `server.host`, `server.base_path` from `AppConfiguration` through a `WebServerFactoryCustomizer` (extending the pattern `TlsConfiguration` already uses); verify `base_path` and `tls` end-to-end.

**Token content type.** Accept both `application/x-www-form-urlencoded` and `application/json` on all four servers: drop or widen Java's `consumes`, stop Rust's 400 rejection and parse both shapes, verify Node and C# already accept both. Document the lenient superset in `docs/SPECIFICATION.md`.

**ACL admin flag.** Replace path-suffix admin detection in `AclAuthorizationFilter` with the explicit admin-endpoint registry the other implementations use; keep the rule that an admin-flagged endpoint requires `admin_endpoints: true` on the scope's ACL rule.

## Testing Strategy

- Unit: profile merge cases, ACL admin matrix.
- Manual: run each server with `CONFIG_PROFILE` and a custom port; `curl /auth/token` with both content types.

## Verification

Per `docs/TESTING.md` loops on `excel-api-java`, `excel-api-csharp`, `excel-api-rust`, `excel-api-node` as touched.
