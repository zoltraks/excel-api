# Standards Version Floors

## Type

Chore

## Summary

The engineering standards in `docs/standard/` must not force a specific
tool or runtime version. They state a minimum recommended version as a
floor ("X or later") with the rationale that patch releases carry
security fixes a project should take automatically - the concrete pin
lives in the toolchain and manifest files, not in the standard.

## Coverage

Documentation only - the vendored standards under `docs/standard/`. No
source, configuration, or test change.

## Description

The convention comes from the canonical standards library this set is
vendored from: a standard states a minimum recommended version as a
floor, never an exact pin and never a floating range such as `latest`.

Apply it to each vendored standard's version statements:

- `csharp-aspnet-development.md` - ".NET 8" becomes ".NET 8 or later"
  with the rationale and the note that `<TargetFramework>` in the
  `.csproj` pins the concrete version.
- `java-spring-development.md` - "Java 21" becomes "Java 21 or later"
  with the same rationale.
- `typescript-fastify-development.md` - "Node.js 22 LTS" becomes
  "Node.js 22 LTS or later"; "TypeScript 5.x" already reads as a floor.
- `go-cli-development.md` - "Go 1.22+" already reads as a floor; add
  the rationale sentence only.
- `rust-api-development.md` - "Axum 0.8 and Tokio 1.54" become floors;
  the project's floor stays "Rust 1.89 or later" and the standard
  points at `rust-toolchain.toml` as the pin location.
- `rust-general-development.md` - wording normalized to the same
  convention; the `channel`/`rust-version` examples stay because they
  demonstrate manifest pinning.
- `openapi-general`, `bash-inline`, `docker-general` - no runtime
  floors; no change.

## Out of Scope

- Re-vendoring canonical files over the locally adapted copies.
- Code, toolchain, or manifest changes - they already pin correctly.
- Version bumps and CHANGELOG entries.
