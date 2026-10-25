# Refactoring Proposal - Java

## Scope

`excel-api-java` - error dispatch, error envelope construction, metrics recording.

## Target Refactoring

1. **Null-safe sheet configuration access.** `entry.getSheets().get(name)` could hit a null map after YAML binding or feed a null config downstream; all six controllers now go through `getSheetConfig(name)` which resolves null-safely to the default single-header layout.

2. **Ordered error envelopes.** `Map.of("error", ..., "message", ...)` has unspecified iteration order - the 401/403 bodies observed `{"message","error"}`. All error writers now use insertion-ordered `LinkedHashMap` so the envelope is `error` then `message` as the contract implies.

3. **Metrics filter-to-collector split.** Per-endpoint families ride on a small endpoint-key normalizer inside `MetricsFilter` rather than duplicating recording code across controllers.
