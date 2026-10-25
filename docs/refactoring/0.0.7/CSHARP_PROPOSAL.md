# Refactoring Proposal - CSharp

## Scope

`excel-api-csharp` - nullability warnings blocking the zero-warning build gate.

## Problem

`Services/ExcelService.cs` declares two local record dictionaries as
`Dictionary<string, object>` (lines 75 and 121) and assigns them to
`RecordItem.Data`, which is typed `Dictionary<string, object?>`.
The compiler emits two `CS8619` nullability warnings, so a clean
Release build is not warning-free.

## Goal

Zero warnings under `dotnet build -c Release` - the locals' declared
element type matches the property's `object?` contract.

## Plan

1. Change `var data = new Dictionary<string, object>();` to
   `new Dictionary<string, object?>()` at line 75.
2. Same change at line 121.
3. Rebuild and re-run `dotnet test` - warnings gone, tests green.

## Risk

None functional - `Data` already accepts nullable values; the change
only aligns the declared type. `dotnet test` covers record paths.

## Acceptance Criteria

- `dotnet build -c Release` reports 0 warnings.
- `dotnet test -c Release` stays green (29 tests).
