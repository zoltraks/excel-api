# Java Source Layout Reorganization Implementation Plan

## Change Request Reference

`docs/change/0.0.3/java-source-layout-reorganization.md`

Approved proposal: `docs/refactoring/0.0.3/JAVA_PROPOSAL.md`.

## Best Practices

`docs/standard/java-spring-maven-development.md` for the affected stack.

## Documentation Updates

- `docs/SPECIFICATION.md`: the `excel-api-java` source layout block is rewritten to the target
  tree before any file moves.
- No changes to `docs/PROJECT.md` or `docs/ARCHITECTURE.md`. The change is internal to the
  Java implementation.

## Baseline Verification

Run the full verification loop from `docs/TESTING.md` on `excel-api-java` before the first
move to establish a known-good baseline.

## Step by Step Implementation

Each step uses `git mv`, updates package declarations and imports, and leaves the tree
buildable.

**Resources cleanup**

Move `src/main/resources/application.properties.example` to
`config/application.example.properties`. Merge `server.servlet.context-path` and
`spring.application.name` from `application.properties` into `application.yaml` and delete the
properties file. Verify with `mvn compile` and `mvn test`.

**Single-class package folds**

Move `controller/advice/GlobalExceptionHandler.java` to `exception/`,
`service/support/CellConverter.java` to `service/`, and `util/DurationParser.java` to
`lifecycle/`. Move `src/test/.../util/DurationParserTest.java` to `lifecycle/`. Update package
declarations and drop redundant imports in `ExcelService` and `LifecycleManager`. Remove the
emptied directories. Verify with `mvn clean compile` and `mvn test`.

**Security consolidation**

Create `security/filter/`. Move `AclAuthorizationFilter`, `JwtAuthenticationFilter`,
`RateLimitFilter`, and `StaticTokenAuthenticationFilter` into it. Move
`CorsFilterConfiguration`, `SecurityConfig`, `TlsConfiguration`, and `WebSecurityConfig` from
`config/` to `security/`. Move `StaticTokenAuthenticationFilterTest` to the
`security/filter/` mirror. All filter imports become package-local. Verify with
`mvn clean compile`, `mvn test`, and `mvn checkstyle:check`.

**Package-info normalization**

Add `package-info.java` to `exception/`, `lifecycle/`, `logging/`, `metrics/`, and
`security/filter/`. Verify with `mvn test`.

## Testing Strategy

Existing unit tests must pass unchanged apart from their own package moves.
No new tests are added in this change. The integration suite is not affected because no
endpoint or behavior changes.

## Verification

Run the verification loop and security checks defined in `docs/TESTING.md` for
`excel-api-java`. The loop must be clean after the final step.
