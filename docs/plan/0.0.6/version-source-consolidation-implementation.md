# Implementation Plan - Version Source Consolidation

## Change Request Reference

`docs/change/0.0.6/version-source-consolidation.md`

## Best Practices

- `docs/standard/bash-inline-development.md` - script conventions
- `docs/standard/openapi-general-development.md` - contract rules

## Documentation Updates

- `docs/VERSIONING.md` - contract `info.version` as single source, new bump flow
- `docs/GUIDELINES.md` and `docs/WORKFLOW.md` - sync script references
- `docs/SPECIFICATION.md` - runtime version sourcing per implementation

## Step by Step Implementation

**Script rename and extension.** Rename `shell/sync-openapi.sh` to `shell/sync.sh` via `git mv`. Extend it to prepend `# GENERATED from docs/contract/openapi.yaml - do not edit` to each synced `resources/openapi.yaml` copy, extract `info.version`, and rewrite `excel-api-node/package.json`, `excel-api-node/package-lock.json`, `excel-api-test/package.json`, `excel-api-test/package-lock.json`, `excel-api-java/pom.xml`, `excel-api-csharp/src/ExcelApi/ExcelApi.csproj`, `excel-api-rust/Cargo.toml`, and regenerate `excel-api-go/internal/config/version.go` with a generated marker.

**Java runtime sourcing.** `HealthController` and `OpenApiController` read `info.version` once from the embedded synced `openapi.yaml` at startup. Remove the `VERSION` constant and the `${version}` replacements. Audit and remove the vestigial `${server.port}` replacement if unused.

**C# runtime sourcing.** `HealthEndpoints` and `OpenApiEndpoints` read `info.version` once from the embedded synced resource. Remove the hardcoded version and `Replace` calls.

**Reference updates.** Update every document referencing `shell/sync-openapi.sh` to `shell/sync.sh` and record the new flow in `docs/VERSIONING.md`.

## Testing Strategy

- Unit: no behavior change expected; existing suites stay green.
- Manual: `grep -rn "0\.0\.6"` finds the literal only in the contract, generated files, and history; `/health` and `/openapi.yaml` report identical versions on all four servers.

## Verification

Per `docs/TESTING.md` verification loop on every touched component, plus the sync-script dry run diff check.
