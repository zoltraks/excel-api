# Java Workbook Endpoint Path Resolution

## Type

Fix

## Summary

`GET /workbooks` and `GET /workbooks/{id}` on the Java implementation
return an empty list and `WORKBOOK_NOT_FOUND` because entry paths are
resolved against the registry directory twice - once in
`WorkbookConfiguration.loadFromConfigurationMap` and again in
`WorkbookController`.

## Coverage

`excel-api-java` only - `WorkbookController` list and detail endpoints.

## Description

`loadFromConfigurationMap` joins `registry.directory` onto each
workbook `path` at bind time, so `entry.getPath()` is already fully
resolved. `WorkbookController` then joins `getDirectory()` onto it a
second time, producing `fixture/<workdir>/fixture/<file>`-style paths
that fail `Files.exists`, so the list shows `items: []` and the
detail endpoint throws `WorkbookNotFoundException`. The cell/record
paths resolve the file correctly through a different resolver, which
is why the defect only surfaces on the workbooks endpoints.

Fix: in `WorkbookController`, resolve `Paths.get(entry.getPath())`
directly in both the list and detail sites - entry paths are already
complete. Also pass the file's basename as `filename` (matching the
other implementations) instead of the joined entry path.

## Hints

- `WorkbookController.listWorkbooks` and the detail handler around
  lines 46-51 and 84-93.
- Regression check: `GET /workbooks` and `/workbooks/simple` return
  the same shapes as the other three servers, `filename` =
  `simple.xlsx`.
