# Java Refactoring Proposal

## Problem

The Java implementation already follows a layered Spring Boot structure, but several issues violate `docs/standard/java-spring-maven-development.md` and the project's quality requirements (N-01, N-02).

- **God service**: `excel-api-java/src/main/java/pl/alyx/api/excel/service/ExcelService.java` is ~24 KB and contains all workbook, sheet, cell, record, and batch operations. A single class handling read, write, header parsing, record mapping, and queue interaction violates the single-responsibility principle.
- **Lint errors already reported by the IDE**:
  - `LifecycleManager.java` line 28 — missing `@NonNull` annotation on the `onApplicationEvent` parameter inherited from `ApplicationListener<ApplicationReadyEvent>`.
  - `AuthController.java` lines 36 and 56 — potential null pointer access on `jsonRequest`.
- **Duplicated config resolution logic**: `ConfigLoader.java` and `AccessConfigLoader.java` each resolve paths, read files, and interpolate variables. The variable-interpolation regex pattern is duplicated.
- **Raw maps**: `ConfigLoader.loadConfig` returns `Map<String, Object>` and the consumers (`WorkbookConfig.loadFromConfigMap`) perform unchecked casts. This defeats the Java type system and produces the unchecked-cast warnings already observed in `WorkbookConfig.java`.
- **No global exception handling**: Each controller maps domain exceptions to HTTP responses inline, risking inconsistent error envelopes.
- **Mixed concerns in controllers**: `AuthController.java` is 7 KB and contains JSON parsing, credential validation, token minting, and response formatting.

## Goal

- Split `ExcelService` into cohesive services: `WorkbookService`, `SheetService`, `CellService`, `RecordService`, `BatchOperationsService`. Shared helpers extracted into `service/support/` (header parsing, value conversion).
- Strongly typed configuration: introduce POJOs (`ServerConfig`, `WorkbookRegistryConfig`, `QueueConfig`, `CacheConfig`, `AuthConfig`, `LoggingConfig`, `LifecycleConfig`) bound via Jackson, replacing `Map<String, Object>` consumers.
- Shared configuration support class `ConfigSupport` containing variable interpolation, YAML mapper, path reading. Used by `ConfigLoader` and `AccessConfigLoader`.
- Global exception handler using `@RestControllerAdvice` mapping domain exceptions (`WorkbookNotFoundException`, `SheetNotFoundException`, `ValidationException`, `FileLockedException`, `ReadonlyWorkbookException`, `ServiceBusyException`) to the project error envelope.
- `AuthController` reduced to request/response binding only; token issuance logic moved to `AuthService` / existing `JwtUtil`.
- Resolve all existing lint warnings: add `@NonNull` annotation, guard against null `jsonRequest`, eliminate unchecked casts.

## Plan

**Step 1 — Lint hygiene**

- Add `@NonNull` to `LifecycleManager.onApplicationEvent` parameter.
- Add null guards in `AuthController` at lines 36 and 56 (return 400 `INVALID_REQUEST` when JSON body is null).
- Run `mvn checkstyle:check` and ensure IDE shows zero warnings.

**Step 2 — Extract ConfigSupport**

- Create `config/ConfigSupport.java` with `interpolateVariables`, `readYamlAsMap`, `readFileContent`.
- Update `ConfigLoader` and `AccessConfigLoader` to delegate to it.
- Update/extend existing tests: `ConfigLoaderTest`, `AccessConfigLoaderTest`.

**Step 3 — Strongly typed configuration**

- Introduce POJOs in `config/model/` for each section.
- Replace `Map<String, Object>` return from `ConfigLoader` with a single `ExcelApiConfig` record/class.
- Update all consumers (`WorkbookConfig`, `LifecycleManager`, security filters, Excel service) to use the typed model.
- Remove all `@SuppressWarnings("unchecked")` in config package.
- Add unit tests for each POJO's YAML binding.

**Step 4 — Global exception handling**

- Create `exception/` package with domain exceptions.
- Create `controller/advice/GlobalExceptionHandler.java` annotated with `@RestControllerAdvice`.
- Replace inline error responses in controllers with domain-exception throws.
- Ensure error envelope matches `docs/PROJECT.md` and `openapi.yaml`.
- Add MockMvc tests verifying each exception yields the correct status and envelope.

**Step 5 — Split ExcelService**

- Extract helpers (header parsing, value conversion, cell reference translation) into `service/support/`.
- Create `WorkbookService`, `SheetService`, `CellService`, `RecordService`, `BatchOperationsService`.
- Update controllers to depend on the new services.
- Keep `ExcelService` as a thin facade during transition or delete after controllers are migrated.
- Update/extend `ExcelServiceTest` into per-service tests.

**Step 6 — Slim AuthController**

- Move token-issuance flow (password and client_credentials grants) into `AuthService`.
- `AuthController` handles only body binding, delegation, and response shaping.
- Add `AuthServiceTest`.

**Step 7 — Verification**

- `mvn clean compile`, `mvn checkstyle:check`, `mvn test`.
- Runtime verification with Go CLI and `LIFE=60s`.
- Integration tests in `excel-api-test/`.

## Risk

- **Spring dependency graph**: Splitting `ExcelService` changes constructor injection points. Missing `@Service` or `@Autowired` breaks startup. Mitigate by running Spring context tests after each split.
- **Typed-config binding**: Jackson mapping of YAML keys with underscores (e.g., `batch_max_size`) requires `@JsonProperty` or a naming strategy. Missing mapping silently drops configuration.
- **Backward compatibility of error envelope**: Introducing `@RestControllerAdvice` may re-map exceptions already handled by Spring defaults (404 from missing routes). Explicit whitelist required.
- **Test churn**: Many existing tests reference `ExcelService` directly. Plan step 5 must update them incrementally.

## Acceptance Criteria

- `mvn clean compile` produces no errors and no warnings.
- `mvn checkstyle:check` reports zero violations.
- `mvn test` passes all existing and new tests.
- Zero IDE-reported warnings in files under `src/main/java/pl/alyx/api/excel/`.
- `ExcelService.java` either deleted or reduced to a thin facade under 5 KB.
- `AuthController.java` reduced to under 3 KB.
- All `@SuppressWarnings("unchecked")` removed from the config package.
- Global exception handler present; no inline `ResponseEntity.status(...).body(error)` calls in controllers.
- Runtime verification with `LIFE=60s` and Go CLI succeeds.
- Integration tests pass.
