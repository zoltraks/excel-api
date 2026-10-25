# Java Runtime Startup Fix - Implementation

*Retroactive record - the work landed in commit `dbe83a4`; documented for
plan-pairing completeness.*

## Change Request Reference

`docs/change/0.0.3/java-runtime-startup-fix.md`

## Best Practices

- `docs/standard/java-spring-development.md` - dependency injection, bean wiring.
- `docs/WORKFLOW.md` per-change cycle and verification loop.

## Documentation Updates

- `docs/SPECIFICATION.md` - Java configuration-loading section reflects
  `AppConfig` typed binding.

## Steps

**Step 1 - Diagnose the cycle**

Reproduce the startup failure: `webSecurityConfig`, `rateLimitFilter`, and
`corsFilter` declare `Map<String, Object>` injection points, which Spring reads
as "every Map bean by name" - a circular dependency that also meant config
content never reached the beans.

**Step 2 - Introduce AppConfig**

Create `config/AppConfig`, a `LinkedHashMap<String, Object>` subclass returned
by `ConfigLoader.loadConfig()`. Consumers inject `AppConfig`, which resolves
unambiguously by type; all `Map` read operations stay unchanged.

**Step 3 - Decouple filter injection**

`WebSecurityConfig` moves its five filter injections from the `@Configuration`
constructor into `securityFilterChain` `@Bean` method parameters, so the
configuration object carries no filter dependencies.

**Step 4 - Negative control**

Verify the identical cycle failure reproduces on the pre-reorganization tree
(`HEAD~1` plus only the baseline compile fix), proving the defect predates the
layout reorganization.

## Testing Strategy

The 62-test suite runs unchanged - tests assigning `loadConfig()` results to
`Map<String, Object>` stay source-compatible because `AppConfig` is a `Map`
subclass.

## Verification

`mvn clean compile`, `mvn checkstyle:check` (0 violations), `mvn test` (62/62),
`mvn package`; runtime smoke on the packaged JAR - starts ~1.1s, filter chain
registers all five filters in order, `/health` and `/metrics` 200,
unauthenticated `/workbooks` 401 - per the change record's verification notes.
