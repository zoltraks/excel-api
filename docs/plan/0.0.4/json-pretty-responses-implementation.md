# JSON Pretty Responses - Implementation

## Change Request Reference

`docs/change/0.0.4/json-pretty-responses.md`

## Best Practices

- `docs/standard/typescript-fastify-development.md` - Fastify serializer conventions.
- `docs/standard/java-spring-development.md` - Jackson configuration.
- `docs/standard/csharp-aspnet-development.md` - `System.Text.Json` options.
- `docs/contract/openapi.yaml` - contract untouched; pretty is a wire format detail.

## Documentation Updates

- `docs/SPECIFICATION.md` - document `server.json.pretty` per implementation.
- `docs/contract/openapi.yaml` - no schema change; `config.example.yaml`
  files gain the key.

## Steps

**Step 1 - Node**

Read `server.json.pretty` into the server config schema; pass Fastify
serialization options that produce two-space indented output for every JSON
response.

**Step 2 - Java**

Bind `server.json.pretty` to the Jackson `ObjectMapper` (indent output) so
all JSON responses serialize with two-space indentation.

**Step 3 - C#**

Bind `server.json.pretty` into the `System.Text.Json`
`JsonSerializerOptions.WriteIndented` used by the minimal-API results.

**Step 4 - Config surface**

Add `server: { json: { pretty: false } }` (or documented equivalent) to each
`config.example.yaml`; default false keeps compact output.

**Step 5 - Integration coverage**

`excel-api-test` gains a parity assertion: with pretty enabled each server
returns indented JSON; with it disabled output is compact.

## Testing Strategy

Unit: config binding test per implementation. Integration: a pretty-enabled
smoke check against a live instance per server.

## Verification

`npm run build && npm test -- --run`, `mvn test`, `dotnet test`, `go test ./...`;
manual `curl` probe showing indented output on each implementation.
