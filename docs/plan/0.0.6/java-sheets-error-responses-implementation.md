# Implementation Plan - Java Sheets Endpoints and Error Response Parity

## Change Request Reference

`docs/change/0.0.6/java-sheets-error-responses.md`

## Best Practices

- `docs/standard/java-spring-development.md`

## Documentation Updates

- `docs/SPECIFICATION.md` - record the `/error` dispatch rule if behavior notes change

## Step by Step Implementation

**Fix the sheets NPE.** Null-safe `entry.getSheets()` at `SheetController` and audit the same call pattern in `ColumnsController`, `RecordController`, `CellController`, `OperationsController`, `LockStatusController`. A workbook without a `sheets:` block resolves to the default layout (single header row 1). Verify snake_case sheet-config keys bind onto the config POJOs.

**Unmask the error dispatch.** Permit the error dispatch in `WebSecurityConfiguration` (`dispatcherTypeMatchers(DispatcherType.ERROR).permitAll()` and/or `requestMatchers("/error").permitAll()`) so thrown exceptions reach `GlobalExceptionHandler` instead of the anonymous-context 401. Map `NoResourceFoundException`/unmapped paths to 404.

**Contract error codes.** `GlobalExceptionHandler` emits `SHEET_NOT_FOUND`, `WORKBOOK_NOT_FOUND`, `ROW_NOT_FOUND` domain codes via `ApiException`, not the generic `NOT_FOUND`.

## Testing Strategy

- Unit: sheet endpoints with configured and unconfigured sheets; security tests assert under-privileged principals still rejected and unmapped paths return 404.
- Integration: Jest suite passes 26/26 against a natively run Java instance; `/bogus/path` returns 404.

## Verification

Per `docs/TESTING.md`: `mvn compile`, `mvn checkstyle:check`, `mvn test`, `mvn package`. JDK 27 - mock interfaces or real objects only.
