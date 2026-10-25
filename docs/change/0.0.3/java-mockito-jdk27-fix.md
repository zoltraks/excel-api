# Java Mockito JDK 27 Test Fix

## Type

Fix

## Summary

`LifecycleManagerTest` fails on modern JDKs - Mockito cannot subclass-mock the
concrete `ApplicationReadyEvent` class. Replace the mock with a real event
instance so the suite runs on JDK 21 and newer toolchains.

## Coverage

Single implementation: `excel-api-java` (test code only - the server,
contract, and other implementations are unaffected).

## Description

`mvn test` on JDK 27 reports three errors in `LifecycleManagerTest`:

- `Mockito cannot mock this class: class org.springframework.boot.context.event.ApplicationReadyEvent`
- Root cause: the bundled byte-buddy predates the running JDK's class-file
  version; subclass-based mocks of concrete classes fail while interface
  mocks still work.

Requirements:

- `event` becomes a real `ApplicationReadyEvent` built from
  `new SpringApplication(...)`, an empty args array, a
  `GenericApplicationContext`, and a `Duration`.
- The `ApplicationContext` mock is replaced by the same
  `GenericApplicationContext` instance - the test stubs no behavior, so a
  real context suffices and the context is closed in `tearDown`.
- No production code changes; behavior, scope, and assertions stay identical.
- `mvn test` passes the full suite on the machine's JDK.

## Out of Scope

- Upgrading Mockito or byte-buddy - deferred; a dependency bump is its own
  change if a future need appears.
- Any other test class.
