# Refactoring Assessment - C#

## Scope

`excel-api-csharp` - sheet lookup error handling and JSON value typing.

## Outcome

1. **Typed exception over message sniffing.** `workbook.Worksheet(name)` throws a framework exception whose message never reached the `SHEET_NOT_FOUND` branch, collapsing every missing-sheet request to 400. All sheet lookups now funnel through `GetWorksheetOrThrow` using `TryGetWorksheet` and raising `SheetNotFoundException`; `ErrorMapping` matches the typed exception before the message-based fallbacks.

2. **Boundary unwrapping of JSON values.** `Dictionary<string, object>` arriving from System.Text.Json carries `JsonElement` leaves that `SetCellValue` wrote as text. The record write path normalizes via `ToDataMap`/`UnwrapJsonValue` at entry, and `SetCellValue` unwraps `JsonElement` defensively.

3. **Dead branch removal.** `GetCellValue` carried an unreachable `XLDataType.DateTime` check inside the `Number` case; cleared as part of the same pass.

Executed as part of the 0.0.6 change window; verification evidence lives in the change-request notes and the final gate run.
