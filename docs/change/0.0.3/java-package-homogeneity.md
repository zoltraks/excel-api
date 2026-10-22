# Java Package Homogeneity

## Type

Refactor

## Summary

Homogenize `excel-api-java` packages so each directory holds one kind of
artifact. A scan of every package after the layout reorganization found members
whose type did not match the package's dominant kind, plus naming and nesting
decisions to normalize.

## Description

Applied decisions:

- `utility/` (new) hosts all stateless helper classes: `RequestGuards` (from
  `controller/` via the short-lived `validation/`), `CellConverter` and
  `SheetLayout` (from `service/`), `DurationParser` (from `lifecycle/`),
  `ConfigSupport` and `ConfigPathResolver` (from `config/`).
- `handler/` (new) hosts `GlobalExceptionHandler`; `exception/` now holds
  `*Exception` types only.
- `security/filter/` becomes top-level `filter/` — servlet filters sit beside
  `security/`, not nested inside it.
- `metrics/` is renamed `observability/` — the package names the concern, not
  the mechanism. `MetricsFilter` stays with `MetricsCollector`.
- `JwtUtil` stays in `security/` as a security-scoped service.
- `controller/` holds only `@RestController` endpoint classes.
- The test tree mirrors every move: `DurationParserTest`, `SheetLayoutTest`,
  and `ConfigSupportTest` move to `utility/`; `StaticTokenAuthenticationFilterTest`
  moves to `filter/`.
- `Configuration` is spelled out everywhere: package `config/` becomes
  `configuration/`, every `*Config` class becomes `*Configuration`
  (`AccessConfiguration`, `WorkbookConfiguration`, `WebSecurityConfiguration`,
  nested `JwtConfiguration`/`TokensConfiguration`/…), and `config`/`cfg`
  variables, parameters, and methods become `configuration` /
  `loadConfiguration()`. File names (`config.yaml`), the `--config`/`CONFIG`
  contract, and the `excel.api.config.path` property are unchanged.
- `logging/` dissolves: `JsonLayout` becomes `utility/JsonLogLayout`, and
  `logback-spring.xml` updates its fully qualified class reference.
  `JsonLogFormatTest` mirrors the move to `utility/` (it still tests a private
  inner class, not the layout — separate coverage gap).
- `security/` dissolves: after the `*Configuration` rename every
  `*Configuration` class is grouped in `configuration/` — the four wiring
  classes (`WebSecurityConfiguration`, `SecurityConfiguration`,
  `CorsFilterConfiguration`, `TlsConfiguration`) move there — and `JwtUtil`
  joins `utility/` (a `*Util`, not a `*Service`). `JwtUtilTest` mirrors to
  `utility/`.
- Name patterns align per package: `ExcelService` becomes `ExcelFileService`
  beside `FileLockService` and `WriteQueueService`; `ExcelServiceTest` becomes
  `ExcelFileServiceTest`; `ConfigurationSupport` becomes
  `ConfigurationEnvironmentSupport` beside `ConfigurationPathResolver`
  (three-word `*Support`/`*Resolver` pairing), test mirrored.

Behavioral requirements:

- Behavior-preserving — no endpoint, configuration key, or runtime change.
- All moves via `git mv`; imports and package declarations rewritten.

## Out of Scope

- `JsonLogFormatTest`, which still tests a private inner class rather than
  `JsonLayout` — a separate coverage gap.

## Verification Notes

- `mvn clean compile`, `mvn test-compile`: clean, no warnings.
- `mvn checkstyle:check`: 0 violations.
- `mvn test`: 62/62 pass.
- `mvn package`: `target/excel-api-0.0.3.jar` repackaged.
- Runtime smoke test on the packaged JAR: starts in ~1.2s, Tomcat binds 8443
  with context path `/api/v1`, `/health` returns 200, unauthenticated
  `/workbooks` returns 401.
