# TLS Transport — Implementation Plan

**Change Request Reference**: `docs/change/0.0.2/tls-transport.md`

**Best Practices**: `docs/standard/ts-node-development.md`, `docs/standard/java-spring-maven-development.md`, `docs/standard/csharp-aspnet-development.md`.

**Documentation Updates**: `docs/SPECIFICATION.md` per-server config sections (new `tls.cert_file`/`key_file` fields); `docs/DEPLOYMENT.md` TLS section — real listeners plus retained proxy-termination note.

**Step by Step Implementation**:

1. **Extend the config schema**
   - Add `server.tls.cert_file` and `server.tls.key_file` (PEM paths) to each loader/config model; validation error when `enabled` without both paths.
   - Files: `excel-api-node/src/config/loader.ts`, `excel-api-java/.../config/ServerConfig.java` (+ loader), `excel-api-csharp/src/ExcelApi/Config/*.cs`, `config.example.yaml` ×3.

2. **Node HTTPS listener**
   - Fastify `https: { cert, key }` option when enabled; keep plain HTTP otherwise.
   - Files: `excel-api-node/src/server.ts`.

3. **Java HTTPS listener**
   - Map `server.tls.*` to Spring Boot `server.ssl.certificate`/`.certificate-private-key`/`enabled` in `application.yaml` or programmatic `WebServerFactory` customization.
   - Files: `application.yaml`/`application.properties`, `config/` wiring.

4. **C# HTTPS listener**
   - Kestrel `Listen`/`UseHttps` with the configured PEM material when `tls.enabled`.
   - Files: `excel-api-csharp/src/ExcelApi/Program.cs`.

5. **Docs + example configs**
   - Update `DEPLOYMENT.md` TLS section and `config.example.yaml` ×3.

**Testing Strategy**: Unit-level config validation tests (enabled-without-material → startup error); runtime HTTPS handshake verified manually/compose per server.

**Verification**: `docs/TESTING.md` loop on all three servers + security gate (transport security change).
