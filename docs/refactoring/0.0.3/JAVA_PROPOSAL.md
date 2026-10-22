# Java Source Layout Reorganization Proposal

## Context

Project: `excel-api-java`, the Java 21 + Spring Boot + Maven server implementation (Apache POI) inside the multi-implementation Excel API repository.

Scope: `src/main/java` (68 files) and `src/main/resources` (5 files).
The test tree `src/test/java` (12 files) moves only as a mirror of main-tree moves.
Build output under `target/` is out of scope.

Applied convention: the request-supplied Java layout guide (Maven standard layout, Oracle package naming, Spring Boot structuring).
Slicing stays by layer - the application has a single domain and no feature boundaries.

Current organization: a sound layered layout.
Findings concentrate in `config/` mixing settings with wiring, three one-class packages, resource hygiene, and inconsistent `package-info.java` coverage.

This proposal was produced by an experimental reorganization procedure and records only verified evidence.

## Rules

1. Maven standard layout is fixed. `src/main/java`, `src/main/resources`, `src/test/java`. Non-build files live at the project root.
2. The base package `pl.alyx.api.excel` holds `Application` and `package-info.java`. One level below, packages slice by architectural layer.
3. `config/` holds settings models, `@ConfigurationProperties` binding, and file loaders only. No web or security wiring.
4. Web and security `@Configuration` classes live in `security/`, beside the filters they register. Servlet filters live in `security/filter/`.
5. A helper class lives next to its sole verified user. No catch-all `util/` package while every helper has exactly one user.
6. A one-class package folds into its semantic home unless it names a distinct cross-cutting concern. `logging/` and `lifecycle/` stay.
7. `@RestControllerAdvice` lives in `exception/` with the types it maps.
8. `src/main/resources` ships runtime resources only. Examples live in the root `config/` directory. One format for `application.*`.
9. `package-info.java` exists in every package or in none. This project standardizes on every package.
10. The test tree mirrors the main tree. Each test is named `<ClassUnderTest>Test`.
11. Layer packages stay flat below the split threshold. `controller/` stays flat at 11 endpoints plus `RequestGuards`.

## Layout

```
excel-api-java/
  pom.xml, Dockerfile, checkstyle.xml, README.md     project root files
  config/                                            example configuration, outside the JAR
    access.example.yaml
    config.example.yaml
    application.example.properties                   moved from resources
  src/main/resources/
    application.yaml                                 single config format, absorbs .properties values
    logback-spring.xml
    openapi.yaml
  src/main/java/pl/alyx/api/excel/
    Application.java, package-info.java              base package
    config/                                          settings models and loaders only
      AccessConfig, AccessConfigLoader, ConfigLoader, ConfigPathResolver,
      ConfigSupport, LoggingConfig, ServerConfig, WorkbookConfig, package-info
    security/                                        web and security wiring
      CorsFilterConfiguration, SecurityConfig, TlsConfiguration,
      WebSecurityConfig, JwtUtil, package-info
      filter/                                        new package - servlet filters
        AclAuthorizationFilter, JwtAuthenticationFilter,
        RateLimitFilter, StaticTokenAuthenticationFilter
    controller/                                      11 controllers + RequestGuards, flat
    dto/                                             API types, unchanged
    exception/                                       9 exceptions + GlobalExceptionHandler
    service/                                         ExcelService, FileLockService, WriteQueueService,
                                                     SheetLayout, CellConverter
    lifecycle/                                       LifecycleManager, DurationParser
    logging/                                         JsonLayout, unchanged
    metrics/                                         MetricsCollector, MetricsFilter, unchanged
  src/test/java/pl/alyx/api/excel/                   mirrors the main tree
```

Dissolved packages: `util/`, `controller/advice/`, `service/support/`.
New package: `security/filter/`.

## Moves

Each moved file with its verified role and destination.
Roles were read from the source, not inferred from names.

| File                                        | Role                                            | Destination                          |
|---------------------------------------------|-------------------------------------------------|--------------------------------------|
| `config/CorsFilterConfiguration.java`       | `@Configuration` building the CORS filter bean  | `security/`                          |
| `config/SecurityConfig.java`                | `@Bean` wiring for JwtUtil and static-token filter | `security/`                       |
| `config/TlsConfiguration.java`              | `@Configuration` applying `server.tls`          | `security/`                          |
| `config/WebSecurityConfig.java`             | `SecurityFilterChain` registering all filters   | `security/`                          |
| `security/AclAuthorizationFilter.java`      | `@Component` scope-to-method ACL filter         | `security/filter/`                   |
| `security/JwtAuthenticationFilter.java`     | `@Component` JWT bearer filter                  | `security/filter/`                   |
| `security/RateLimitFilter.java`             | `@Component` fixed-window rate limiter          | `security/filter/`                   |
| `security/StaticTokenAuthenticationFilter.java` | static-token filter, bean via `SecurityConfig` | `security/filter/`               |
| `controller/advice/GlobalExceptionHandler.java` | `@RestControllerAdvice` exception mapping   | `exception/`                         |
| `service/support/CellConverter.java`        | static DTO-to-POI cell helpers, sole user `ExcelService` | `service/`                 |
| `util/DurationParser.java`                  | duration-string parser, sole user `LifecycleManager` | `lifecycle/`                   |
| `resources/application.properties.example`  | example file shipped inside the JAR             | `config/application.example.properties` |
| `resources/application.properties`          | duplicate config format shadowing the yaml      | deleted, merged into `application.yaml` |
| `test/util/DurationParserTest.java`         | mirrors `DurationParser`                        | `test/lifecycle/`                    |
| `test/security/StaticTokenAuthenticationFilterTest.java` | mirrors the filter             | `test/security/filter/`              |

Verified stay-put files the names might suggest moving: `JwtUtil` is a token service used by
the wiring and the auth endpoint, not a filter. `MetricsFilter` is registered by
`WebSecurityConfig` but belongs to the metrics concern. `JsonLayout` is referenced by name in
`logback-spring.xml`. `ConfigLoader` and `AccessConfigLoader` carry `@Configuration` but their
role is file loading, so they stay in `config/`.

## Consequences

- Import mechanics are minimal. The four filters are imported only by `WebSecurityConfig` and `SecurityConfig`, which land in the same `security/` package. `CellConverter` is imported only by `ExcelService`. `DurationParser` is imported only by `LifecycleManager`. `GlobalExceptionHandler` is component-scanned and has no import sites. The wiring classes have no external importers.
- Filters keep importing `config.AccessConfig` unchanged. `AccessConfig` stays in `config/`.
- `application.properties` is deleted after merging `server.servlet.context-path` and `spring.application.name` into `application.yaml`. `server.port` is already duplicated there. The `.properties` precedence no longer shadows the yaml file.
- `logback-spring.xml` references `pl.alyx.api.excel.logging.JsonLayout` by class name. `JsonLayout` does not move and the reference stays stable.
- `openapi.yaml` is served from the classpath and stays.
- The built JAR stops shipping `application.properties.example`. The file joins the root `config/` examples under the existing `*.example.*` pattern.
- Test mirrors: `DurationParserTest` moves to `lifecycle/`, `StaticTokenAuthenticationFilterTest` moves to `security/filter/`, `JwtUtilTest` stays in `security/`.
- `JsonLogFormatTest` does not exercise `JsonLayout`. It asserts on a private inner `LogEntry` class defined inside the test. A rename to `JsonLayoutTest` would misreport coverage, so the file is flagged for a real test rather than a move.
- Component scanning is unaffected. Every target package stays under the base package.
- Catch-all discipline: after the moves no `util/`, `support/`, or `advice/` package exists. A future helper earns `util/` only when it gains a second user.
- Coverage gaps recorded, not layout-blocking: no tests exist for `controller/`, `dto/`, `exception/`, or `metrics/`.

## Enforcement

- Existing gate: `mvn checkstyle:check` keeps running unchanged.
- Proposed check: a test-scope ArchUnit `PackageStructureTest` riding the existing Surefire run. Asserts that no classes reside in `..util..`, `..controller.advice..`, or `..service.support..`, that `*Filter` classes reside in `security.filter`, and that every package under the base package contains `package-info.java`.
- Companion resource check: the same test asserts `src/main/resources` contains no `*.example.*` files.
- Placement: `src/test/java/pl/alyx/api/excel/PackageStructureTest.java`. No CI change required.

## Migration Order

**Wave 1 - resources**

`git mv` `src/main/resources/application.properties.example` to `config/application.example.properties`.
Merge `application.properties` values into `application.yaml` and delete the properties file.
No Java references. Verify with `mvn test` and a startup run.

**Wave 2 - single-class folds**

`git mv` `GlobalExceptionHandler` to `exception/`, `CellConverter` to `service/`, `DurationParser` to `lifecycle/` with `DurationParserTest` mirroring.
Update package declarations and drop the now-redundant imports in `ExcelService` and `LifecycleManager`.
Verify with `mvn clean compile` and `mvn test`.

**Wave 3 - security consolidation**

Create `security/filter/`.
`git mv` the four filters into it and the four wiring classes (`CorsFilterConfiguration`, `SecurityConfig`, `TlsConfiguration`, `WebSecurityConfig`) into `security/`.
Move `StaticTokenAuthenticationFilterTest` to the `security/filter/` mirror.
All filter imports become package-local. Update package declarations.
Verify with `mvn clean compile`, `mvn test`, `mvn checkstyle:check`.

**Wave 4 - package-info normalization**

Add `package-info.java` to `exception/`, `lifecycle/`, `logging/`, `metrics/`, and `security/filter/`.
Documentation-only wave. Verify with `mvn test`.

## Uncertain Placements

- `DurationParser` to `lifecycle/`: verified by sole usage in `LifecycleManager`, not by name semantics. Reconsider a shared home if a second user appears.
- `CorsFilterConfiguration` and `TlsConfiguration` to `security/`: follows the guide's transport-security grouping. A `web/` package was rejected because it would create a second wiring home for three classes.
- `MetricsFilter` stays in `metrics/`: `WebSecurityConfig` registers it, but its concern is metrics collection. Moving it for naming symmetry would mix concerns.
- `GlobalExceptionHandler` to `exception/`: verified `@RestControllerAdvice` with no import sites.

## Acceptance Criteria

- The tree matches the Layout section: `util/`, `controller/advice/`, and `service/support/` are gone and `security/filter/` exists.
- `config/` holds settings models and loaders only.
- `src/main/resources` contains exactly `application.yaml`, `logback-spring.xml`, `openapi.yaml`.
- Every moved test mirrors its class's new package, and `package-info.java` is present in every package.
- `mvn clean compile`, `mvn test`, and `mvn checkstyle:check` pass with zero errors.
- The `PackageStructureTest` enforcement check passes once adopted.
