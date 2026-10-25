# JSON Pretty Responses

## Type

Feature

## Summary

Add an optional `server.json.pretty` boolean to `config.yaml`. When enabled, the
server formats every JSON response body with newlines and indentation instead of
the current compact single-line output.

## Coverage

All supported server implementations: Node (`excel-api-node`), Java
(`excel-api-java`), and C# (`excel-api-csharp`). The shared `config.yaml`
contract gains the same key in all three.
`excel-api-test` gains integration coverage for the pretty output where
relevant.
`excel-api-go` is a client and is not affected - stated explicitly.

## Description

The shared configuration gains a nested `json` section under `server`:

```yaml
server:
  json:
    pretty: true
```

Behavioral requirements:

- `server.json.pretty` accepts a boolean value.
- An absent `json` section, an absent `pretty` key, or `pretty: false` keeps the
  current compact JSON output - full backward compatibility with existing
  configuration files.
- When `pretty: true`, every JSON response body is serialized with newlines and
  a two-space indent - resource payloads, collection envelopes, error responses,
  and the health endpoint alike. The two-space style is fixed so all three
  implementations emit byte-identical formatting.
- Pretty formatting changes bytes on the wire only. Field names, field order,
  values, status codes, headers, and content type are unchanged.
- Non-JSON responses (`/openapi.yaml`, `/metrics`) are unaffected.
- The configuration key is part of the shared contract: all three servers accept
  it, ignore it identically when disabled, and reject or ignore invalid values
  per the existing configuration-validation convention of each implementation.
- Example configuration files (`config/config.example.yaml`) gain the
  documented key.

## Out of Scope

- Response schema or field changes.
- Go CLI output formatting.
- A version bump - handled as a separate user-requested step.
