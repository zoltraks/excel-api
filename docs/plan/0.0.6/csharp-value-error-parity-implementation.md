# Implementation Plan - C# Value Typing and Error Mapping Parity

## Change Request Reference

`docs/change/0.0.6/csharp-value-error-parity.md`

## Best Practices

- `docs/standard/csharp-aspnet-development.md`

## Documentation Updates

- `docs/SPECIFICATION.md` - no spec change expected; correct only if behavior notes are stale

## Step by Step Implementation

**Preserve JSON value types on write.** `AddRecordRequest.Data`/`UpdateRecordRequest.Data` deserialize object values as `JsonElement`. Unwrap them through `UnwrapJsonValue` before `SetCellValue` in `ApplyAddRecord`, `ApplyUpdateRecord`, and `ApplyWriteCell`; add a `JsonElement` arm to `SetCellValue` as defense.

**Return 404 for unknown sheets.** Replace throwing `workbook.Worksheet(name)` calls with `TryGetWorksheet` in `ReadCell`, `ReadRange`, `ReadRecords`, `ReadRecord`, `GetWorksheetOrThrow`, `GetSheetMetadata`, `GetColumnDefinitions`. Throw a dedicated `SheetNotFoundException` and add a typed catch mapping to `404 SHEET_NOT_FOUND` in `ErrorMapping` ahead of the message-sniffing `ArgumentException` branch.

**Cleanup.** Remove the dead `XLDataType.DateTime` check nested inside the `Number` case in `GetCellValue`.

## Testing Strategy

- Unit: number round-trip through record and cell writes; unknown sheet returns 404 on every sheet-addressed endpoint.
- Integration: Jest suite passes 26/26 against a natively run C# instance.

## Verification

Per `docs/TESTING.md`: `dotnet build`, `dotnet format --verify-no-changes`, `DOTNET_ROLL_FORWARD=LatestMajor dotnet test`, `dotnet publish -c Release`.
