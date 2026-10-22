# Java Runtime Startup Fix

## Type

Fix

## Summary

The packaged `excel-api-java` application failed to start. Spring reported a circular
dependency between beans (`webSecurityConfig`, `rateLimitFilter`, `corsFilter`) and
aborted context refresh. The defect predates the 0.0.3 source-layout reorganization —
it reproduces identically on the pre-reorganization tree once the committed compile
break is patched, and it also meant the `config.yaml` content never actually reached
the three beans that request it.

## Description

Three beans declared a `Map<String, Object>` injection point intending to receive the
`loadConfig` bean from `ConfigLoader`: `TlsConfiguration.tlsCustomizer`,
`CorsFilterConfiguration.corsFilter`, and the `RateLimitFilter` constructor. Spring
interprets a declared `Map<K, V>` injection point as "all beans of type `V` keyed by
bean name", not as a lookup for a Map-typed bean. Each of the three therefore
depended on every bean in the context — producing the circular reference — and, had
it started, would have read bean names rather than configuration values.

The fix introduces `config/AppConfig`, a `LinkedHashMap<String, Object>` subclass
that `ConfigLoader.loadConfig()` now returns. Consumers inject `AppConfig`, which
resolves unambiguously by type; all `Map` read operations used by the consumers are
unchanged. `WebSecurityConfig` also moves its five filter injections from the
`@Configuration` constructor into the `securityFilterChain` `@Bean` method
parameters, so the configuration object itself carries no filter dependencies.

Behavioral requirements:

- No endpoint, configuration key, or runtime behavior changes. Consumers now receive
  the configuration the code always intended them to receive.
- `AppConfig` lives in `config/` with the other settings models.
- Tests assigning `loadConfig()` results to `Map<String, Object>` remain source-
  compatible.

## Out of Scope

- Excluding `UserDetailsServiceAutoConfiguration`, whose generated-password warning
  remains in startup logs. The application is token-authenticated and defines no
  `UserDetailsService`; the warning is cosmetic and reported separately.
- Converting the remaining map-shaped config sections to typed settings classes.

## Verification Notes

- `mvn clean compile`: BUILD SUCCESS, no warnings.
- `mvn checkstyle:check`: 0 violations (non-fatal `certificate_expired` metadata
  warning from the dead `jvnet-nexus-releases` repository persists).
- `mvn test`: 62/62 pass.
- `mvn package`: `target/excel-api-0.0.3.jar` repackaged by Spring Boot.
- Runtime smoke test on the packaged JAR with `config/` examples copied to a work
  directory: application starts in ~1.1s, Tomcat binds 8443 with context path
  `/api/v1`, the security filter chain registers all five filters in order,
  `GET /api/v1/health` returns 200, `GET /api/v1/metrics` returns 200, and an
  unauthenticated `GET /api/v1/workbooks` returns 401.
- Negative control: the identical cycle failure reproduces on the
  pre-reorganization tree (`HEAD~1` plus only the baseline compile fix), proving
  the defect is latent in the committed source rather than introduced by the
  reorganization.
