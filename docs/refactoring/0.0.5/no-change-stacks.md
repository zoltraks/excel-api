# Refactoring Assessment - excel-api-java, excel-api-csharp, excel-api-go

**Change window**: 0.0.5
**Components**: excel-api-java, excel-api-csharp, excel-api-go

## Assessment - no refactoring this window

These three components were not modified by the active change requests
(`fastify-major-upgrade` scopes to `excel-api-node`;
`rust-api-implementation` adds a new component). Refactoring them inside
this window would mix unrelated diffs into the review and risk
unintended behavior drift.

Recorded candidates for a future window:

- **Java/C#** - the `/health` and `/openapi.*` version literals are
  hardcoded and currently stale (`0.0.3` vs contract `0.0.5`), same
  drift pattern as the Node refactor this window. Resolve from
  `pom.xml`/`csproj` or the shared contract copy.
- **Go** - `internal/config/version.go` stays a literal by design (the
  VERSIONING table names it the bump target).

No action taken; ladders stay green (`mvn compile`, `checkstyle:check`,
`mvn test`; `dotnet build`, `dotnet format --verify-no-changes`,
`dotnet test`; `go build`, `gofmt`, `go vet`, `go test`).
