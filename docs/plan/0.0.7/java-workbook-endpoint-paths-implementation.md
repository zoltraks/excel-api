# Implementation Plan - Java Workbook Endpoint Path Resolution

## Change Request Reference

`docs/change/0.0.7/java-workbook-endpoint-paths.md`

## Best Practices

- `docs/standard/java-spring-development.md`

## Documentation Updates

None - behavioral fix, no doc surface changes.

## Step by Step Implementation

1. In `WorkbookController.listWorkbooks`, replace the second
   `Paths.get(registryDir, entry.getPath())` join with
   `Paths.get(entry.getPath())` - entry paths already carry the resolved
   registry directory from `loadFromConfigurationMap`.
2. Same replacement in the detail handler (`getWorkbook`).
3. Pass `path.getFileName().toString()` as the `filename` field of
   `WorkbookInfo` in both sites, matching the basename the other
   implementations return.
4. Remove the now-unused `registryDir` locals.
5. Rebuild (`mvn package`), restart the server, and verify
   `GET /workbooks` lists every registry entry and
   `GET /workbooks/simple` returns `filename: "simple.xlsx"`.

## Testing Strategy

- `mvn test` stays green (61 tests).
- Live smoke on port 4802: `/workbooks` non-empty,
  `/workbooks/simple` shape parity with the other servers.

## Verification

`mvn -q compile` (zero warnings), `mvn test`, live endpoint check.
