# Configuration Surface Parity

## Type

Feature

## Summary

Three configuration schema features diverge across implementations:
`profiles`/`CONFIG_PROFILE` support, `server` listener binding, and the
`/auth/token` content type.

## Coverage

`excel-api-java`, `excel-api-csharp`, and a conformance decision that
touches all four servers' `/auth/token` behavior.

## Description

- **Profiles**: `config.yaml` supports a `profiles:` map selected by
  `CONFIG_PROFILE` in Node and Rust. C# has no profiles support at all;
  Java binds a `profiles` map on `ServerConfiguration` but nothing ever
  applies it (`getProfiles()` is unread). Both must implement profile
  selection with the same merge semantics as Node.
- **Listener binding**: Java ignores `server.port`/`server.host` (and
  needs verification for `server.base_path`/`server.tls`) from
  `config.yaml` - the embedded Tomcat binds only `application.yaml`
  values (proven: a `port: 8445` config still bound 8443). Node, C#, and
  Rust all bind from `config.yaml`. Java must wire the config's server
  section to the web server factory.
- **`/auth/token` content type**: the contract declares
  `application/x-www-form-urlencoded`. Rust enforces it (400 otherwise);
  Node, Java, and C# also accept `application/json` bodies. Pick one
  behavior for all four - recommended: accept both, document the lenient
  superset in `docs/SPECIFICATION.md`, and adjust Rust to match.
- **`acl` `admin_endpoints` flag**: Java's ACL filter derives admin-ness
  from the request path suffix rather than honoring the `admin_endpoints`
  flag on ACL rules in `access.yaml` - verify and align semantics across
  all four.

Acceptance: identical config.yaml/access.yaml schema features behave the
same on every implementation; profile selection, listener binding, and
token content-type behavior verified end-to-end on each server.

## Out of Scope

- New configuration keys - this is parity of the existing schema.
- Metrics surface (separate change request).
