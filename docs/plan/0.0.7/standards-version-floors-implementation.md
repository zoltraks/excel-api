# Implementation Plan - Standards Version Floors

## Change Request Reference

`docs/change/0.0.7/standards-version-floors.md`

## Best Practices

- `docs/STYLE.md` - documentation formatting rules

## Documentation Updates

This change is documentation-only. The affected documents are the
deliverable itself, all under `docs/standard/`:

- `csharp-aspnet-development.md`
- `java-spring-development.md`
- `typescript-fastify-development.md`
- `go-cli-development.md`
- `rust-api-development.md`
- `rust-general-development.md`

## Step by Step Implementation

**Apply floor phrasing.** Rephrase each stack bullet that names an
exact version into a minimum-recommended floor: ".NET 8" to ".NET 8 or
later", "Java 21" to "Java 21 or later", "Node.js 22 LTS" to
"Node.js 22 LTS or later".

**Add the rationale.** On each touched stack section, add the floor
rationale: a patch release carries security fixes the project should
take automatically, and the toolchain or manifest file pins the
concrete version.

**Rust floors.** In `rust-api-development.md` turn "Axum 0.8 and
Tokio 1.54" into floors; keep "Rust 1.89 or later" as the project
floor and point at `rust-toolchain.toml` for the pin. In
`rust-general-development.md` normalize the language-version wording to
the same convention, keeping the `channel`/`rust-version` examples.

**Bump the headers.** Re-stamp the `Standards set` version comment on
every changed file.

## Testing Strategy

Documentation-only change - no unit or integration tests apply.

## Verification

`git diff --check` plus a `docs/STYLE.md` pass on edited regions. The
component verification loop does not apply - no source, configuration,
or test file changes.
