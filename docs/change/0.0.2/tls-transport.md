# TLS Transport

**Type**: Feature

**Summary**: `server.tls.enabled` is parsed by all three servers but never wired — every listener is plaintext HTTP. Implement real TLS listeners honoring the configuration so credentials and workbook data are encrypted in transit.

**Description**:

Audit finding FND-SEC-004 / recommendation REC-006.

- Extend the `server.tls` configuration schema with `cert_file` and `key_file` (PEM paths) in all three servers and in `config.example.yaml`.
- When `tls.enabled` is true and cert/key are configured, each server must negotiate HTTPS on its listener.
  - Node: Fastify `https` option.
  - Java: Spring Boot SSL via `server.ssl.certificate` / `server.ssl.certificate-private-key` driven by the app config.
  - C#: Kestrel HTTPS endpoint configuration.
- `tls.enabled: false` (or absent cert/key) keeps the current HTTP behavior; a startup validation error is acceptable when TLS is enabled without certificate material.
- The served OpenAPI `servers` URL scheme already reacts to the flag; verify it matches the actual listener.
- Update `DEPLOYMENT.md` TLS section to describe the real listener behavior and keep the reverse-proxy termination note as an alternative.

## Out of Scope

- Mutual TLS / client certificates.
- Certificate management tooling.
