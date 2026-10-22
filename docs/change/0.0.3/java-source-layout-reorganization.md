# Java Source Layout Reorganization

## Type

Refactor

## Summary

Reorganize the `excel-api-java` source tree so each package has a single role.
The `config/` package currently mixes settings models, file loaders, and web/security wiring,
three one-class packages add navigation overhead, and an example file ships inside the JAR.

## Description

Apply the approved reorganization proposal in `docs/refactoring/0.0.3/JAVA_PROPOSAL.md`.

Behavioral requirements:

- The change is behavior-preserving. No endpoint, configuration key, or runtime behavior changes.
- `config/` keeps settings models and file loaders only. The four `@Configuration` classes that
  wire web and security beans move to `security/`.
- The four servlet filters move to a new `security/filter/` package.
- `controller/advice/` and `service/support/` dissolve. `GlobalExceptionHandler` joins
  `exception/` and `CellConverter` joins `service/` beside its sole user.
- `util/` dissolves. `DurationParser` joins `lifecycle/` beside its sole user `LifecycleManager`.
- `application.properties.example` leaves `src/main/resources` for the root `config/` directory
  as `application.example.properties`.
- `application.properties` is removed after its values merge into `application.yaml`, so a
  single configuration format remains.
- `package-info.java` is added to every package that lacks one.
- The test tree mirrors every main-tree move.

## Out of Scope

- Code changes inside moved files beyond package declarations and imports.
- New tests for the uncovered `controller/`, `dto/`, `exception/`, and `metrics/` packages.
- Rewriting `JsonLogFormatTest`, which is flagged in the proposal as a coverage gap.
- The ArchUnit `PackageStructureTest` enforcement check, which is proposed separately.

## Verification Notes

- `mvn clean compile`: BUILD SUCCESS.
- `mvn checkstyle:check`: 0 violations.
- `mvn test`: 62/62 pass.
- `mvn package`: `target/excel-api-0.0.3.jar` repackaged; the JAR contains only
  `application.yaml`, `logback-spring.xml`, and `openapi.yaml` in `BOOT-INF/classes` —
  the example properties file no longer ships.
- A latent bean-cycle defect surfaced only when the packaged JAR was first booted;
  it is pre-existing (reproduced on the pre-move tree) and fixed separately in
  `docs/change/0.0.3/java-runtime-startup-fix.md`.
