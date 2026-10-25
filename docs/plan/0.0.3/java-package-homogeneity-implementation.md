# Java Package Homogeneity - Implementation

*Retroactive record - the work landed in commit `dbe83a4` (with `046a9e7`
carrying the earlier layout phase); documented for plan-pairing completeness.*

## Change Request Reference

`docs/change/0.0.3/java-package-homogeneity.md`

## Best Practices

- `docs/standard/java-spring-development.md` - package roles, naming, constructor injection.
- `docs/WORKFLOW.md` per-change cycle and verification loop.

## Documentation Updates

- `docs/SPECIFICATION.md` - Java package layout section updated to the
  homogeneous package model.

## Steps

**Step 1 - Utility extraction**

Create `utility/` hosting all stateless helpers: `RequestGuards`,
`CellConverter`, `SheetLayout`, `DurationParser`, `ConfigSupport`,
`ConfigPathResolver`. Mirror test classes into `utility/`.

**Step 2 - Handler and filter packages**

Create `handler/` for `GlobalExceptionHandler`; `exception/` keeps `*Exception`
types only. Lift `security/filter/` to top-level `filter/`.

**Step 3 - Observability rename**

Rename `metrics/` to `observability/`; `MetricsFilter` stays with
`MetricsCollector`.

**Step 4 - Configuration spelling**

Rename package `config/` to `configuration/`; every `*Config` class becomes
`*Configuration` and `config`/`cfg` members become `configuration` /
`loadConfiguration()`. File names (`config.yaml`), the `--config`/`CONFIG`
contract, and `excel.api.config.path` stay unchanged.

**Step 5 - Dissolve logging and security packages**

`JsonLayout` becomes `utility/JsonLogLayout`; `logback-spring.xml` updates its
reference. The four wiring classes (`WebSecurityConfiguration`,
`SecurityConfiguration`, `CorsFilterConfiguration`, `TlsConfiguration`) move to
`configuration/`; `JwtUtil` joins `utility/`. `ExcelService` becomes
`ExcelFileService`; `ConfigurationSupport` becomes
`ConfigurationEnvironmentSupport`. All moves via `git mv` with imports and
package declarations rewritten; test tree mirrors every move.

## Testing Strategy

Unit tests mirror every moved class - `DurationParserTest`,
`SheetLayoutTest`, `ConfigSupportTest`, `JwtUtilTest`,
`StaticTokenAuthenticationFilterTest`, `ExcelFileServiceTest` relocate with the
sources they cover.

## Verification

`mvn clean compile`, `mvn test-compile`, `mvn checkstyle:check` (0 violations),
`mvn test` (62/62), `mvn package`; runtime smoke on the packaged JAR - starts
~1.2s, `/api/v1/health` 200, unauthenticated `/workbooks` 401 - per the change
record's verification notes.
