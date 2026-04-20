# Development Workflow

## Build-Test-Fix Loop

Every code change follows this cycle. Do not skip steps.

**Build.** Compile the implementation.

- Node: `npm run build`
- Java: `mvn package -DskipTests`
- C#: `dotnet build`
- Go: `go build ./...`

**Lint.** Run static analysis.

- Node: `npm run lint`
- Java: `mvn checkstyle:check`
- C#: `dotnet format --verify-no-changes`
- Go: `golangci-lint run`

**Test.** Run unit tests.

- Node: `npm test`
- Java: `mvn test`
- C#: `dotnet test`
- Go: `go test ./...`

**Fix.** Address all errors and warnings before proceeding.

**Integration test.** Run the shared test suite against the built implementation.

```bash
IMPL=excel-api-node docker compose -f docker-compose.test.yaml up --abort-on-container-exit
```

## Adding a New Endpoint

**Update the contract.** Edit `docs/contract/openapi.yaml` with the new endpoint, request/response schemas, and error codes.

**Synchronize.** Run `shell/sync-openapi.sh` to propagate the contract to all implementations.

**Update documentation.** Add the endpoint to `docs/ARCHITECTURE.md` (endpoint table) and `docs/PROJECT.md` (if it affects requirements).

**Implement.** Add the endpoint in each implementation following its development standard.

**Add integration test.** Write a test in `excel-api-test/integration/` that exercises the new endpoint.

**Run the full test suite.** Verify all three implementations pass.

## Modifying an Existing Endpoint

Follow the same sequence as adding a new endpoint. Ensure backward compatibility or document the breaking change in `CHANGELOG.md`.

## Working with AI Coding Agents

When delegating implementation to an AI coding agent, provide the following context:

- `docs/PROJECT.md` — project requirements and constraints
- `docs/ARCHITECTURE.md` — shared architecture and data model
- `docs/SPECIFICATION.md` — section for the target implementation
- The relevant development standard from `docs/standard/`
- The `openapi.yaml` contract (from the implementation's `resources/` directory)
- The specific source files being modified

Verify agent output against the build-test-fix loop before committing.
