using ClosedXML.Excel;
using BigBytes.ExcelApi.Excel;

namespace BigBytes.ExcelApi.Services;

public class ExcelService
{
    public List<string> ReadSheetNames(string filePath)
    {
        using var workbook = new XLWorkbook(filePath);
        var sheets = new List<string>();

        for (int i = 1; i <= workbook.Worksheets.Count; i++)
        {
            sheets.Add(workbook.Worksheet(i).Name);
        }

        return sheets;
    }

    public CellData ReadCell(string filePath, string sheetName, string cellRef, string format)
    {
        using var workbook = new XLWorkbook(filePath);
        var worksheet = workbook.Worksheet(sheetName);

        if (worksheet == null)
        {
            throw new ArgumentException($"Sheet '{sheetName}' not found");
        }

        var cell = worksheet.Cell(cellRef);
        return ConvertCell(cell, format);
    }

    public RangeData ReadRange(string filePath, string sheetName, string rangeRef, string format)
    {
        using var workbook = new XLWorkbook(filePath);
        var worksheet = workbook.Worksheet(sheetName);

        if (worksheet == null)
        {
            throw new ArgumentException($"Sheet '{sheetName}' not found");
        }

        var range = worksheet.Range(rangeRef);
        var rows = new List<RangeRow>();

        for (int r = 1; r <= range.RowCount(); r++)
        {
            var cells = new List<CellData>();
            for (int c = 1; c <= range.ColumnCount(); c++)
            {
                cells.Add(ConvertCell(range.Cell(r, c), format));
            }
            rows.Add(new RangeRow
            {
                Row = range.Row(r).RowNumber(),
                Cells = cells
            });
        }

        return new RangeData { Range = rangeRef, Rows = rows };
    }

    public RecordListResponse ReadRecords(string filePath, string sheetName, SheetHeaderConfig? sheetConfig, int offset, int limit, string format)
    {
        using var workbook = new XLWorkbook(filePath);
        var worksheet = workbook.Worksheet(sheetName);

        if (worksheet == null)
        {
            throw new ArgumentException($"Sheet '{sheetName}' not found");
        }

        var layout = SheetLayout.Resolve(sheetConfig);
        var headers = ResolveColumnIds(workbook, worksheet, layout);

        var lastRowUsed = worksheet.LastRowUsed();
        int lastRow = lastRowUsed != null ? lastRowUsed.RowNumber() : 0;
        int totalDataRows = Math.Max(0, lastRow - layout.FirstDataRow + 1);

        int startRow = layout.FirstDataRow + offset;
        int endRow = Math.Min(startRow + limit - 1, lastRow);

        var items = new List<RecordItem>();

        for (int r = startRow; r <= endRow; r++)
        {
            var row = worksheet.Row(r);
            var data = new Dictionary<string, object>();

            for (int c = 0; c < headers.Length; c++)
            {
                var header = headers[c];
                if (!string.IsNullOrEmpty(header))
                {
                    var cell = row.Cell(c + 1);
                    data[header] = GetCellValue(cell, format);
                }
            }

            // 1-based record index
            int recordIndex = offset + (r - startRow) + 1;
            items.Add(new RecordItem { Index = recordIndex, Data = data });
        }

        return new RecordListResponse
        {
            Items = items,
            Total = totalDataRows,
            Offset = offset,
            Limit = limit,
            Format = format
        };
    }

    public RecordItem ReadRecord(string filePath, string sheetName, int recordIndex, SheetHeaderConfig? sheetConfig, string format)
    {
        using var workbook = new XLWorkbook(filePath);
        var worksheet = workbook.Worksheet(sheetName);

        if (worksheet == null)
        {
            throw new ArgumentException($"Sheet '{sheetName}' not found");
        }

        var layout = SheetLayout.Resolve(sheetConfig);
        var headers = ResolveColumnIds(workbook, worksheet, layout);

        // Convert 1-based record index to Excel row number
        int excelRowNumber = layout.FirstDataRow + recordIndex - 1;
        var lastRowUsed = worksheet.LastRowUsed();
        int lastRow = lastRowUsed != null ? lastRowUsed.RowNumber() : 0;

        if (recordIndex < 1 || excelRowNumber > lastRow)
        {
            throw new ArgumentException($"Record index {recordIndex} out of range");
        }

        var row = worksheet.Row(excelRowNumber);
        var data = new Dictionary<string, object>();

        for (int c = 0; c < headers.Length; c++)
        {
            var header = headers[c];
            if (!string.IsNullOrEmpty(header))
            {
                var cell = row.Cell(c + 1);
                data[header] = GetCellValue(cell, format);
            }
        }

        return new RecordItem { Index = recordIndex, Data = data };
    }

    private CellData ConvertCell(IXLCell cell, string format)
    {
        var value = GetCellValue(cell, format);
        var type = GetCellType(cell);
        var numberFormat = cell.Style.NumberFormat.Format;
        var isFormula = cell.HasFormula;
        var formatted = format == "display" ? cell.GetFormattedString() : null;

        return new CellData
        {
            Ref = cell.Address.ToString(),
            Column = cell.Address.ColumnLetter,
            Row = cell.Address.RowNumber,
            Value = value,
            Type = type,
            NumberFormat = numberFormat,
            IsFormula = isFormula,
            Formatted = formatted
        };
    }

    private object GetCellValue(IXLCell cell, string format)
    {
        if (cell.IsEmpty())
        {
            return "";
        }

        switch (cell.DataType)
        {
            case XLDataType.Text:
                return cell.GetString();
            case XLDataType.Number:
                if (cell.DataType == XLDataType.DateTime)
                {
                    var dateTime = cell.GetDateTime();
                    return format == "string" ? dateTime.ToString("o") : dateTime;
                }
                return cell.GetDouble();
            case XLDataType.Boolean:
                return cell.GetBoolean();
            case XLDataType.TimeSpan:
                return cell.GetTimeSpan().ToString();
            case XLDataType.DateTime:
                var dt = cell.GetDateTime();
                return format == "string" ? dt.ToString("o") : dt;
            default:
                return cell.GetString();
        }
    }

    private string GetCellType(IXLCell cell)
    {
        if (cell.IsEmpty())
        {
            return "empty";
        }

        switch (cell.DataType)
        {
            case XLDataType.Text:
                return "string";
            case XLDataType.Number:
                return "number";
            case XLDataType.Boolean:
                return "boolean";
            case XLDataType.DateTime:
                return "date";
            case XLDataType.TimeSpan:
                return "string";
            default:
                return "string";
        }
    }

    public CellData WriteCell(string filePath, string sheetName, string cellRef, object? value)
    {
        using var workbook = new XLWorkbook(filePath);
        var worksheet = GetWorksheetOrThrow(workbook, sheetName);

        var cellData = ApplyWriteCell(worksheet, cellRef, value);

        workbook.Save();

        return cellData;
    }

    private static IXLWorksheet GetWorksheetOrThrow(XLWorkbook workbook, string sheetName)
    {
        var worksheet = workbook.Worksheet(sheetName);
        if (worksheet == null)
        {
            throw new ArgumentException($"Sheet '{sheetName}' not found");
        }
        return worksheet;
    }

    /// <summary>
    /// Resolves column ids: identifier row for single/multi, legend sheet for
    /// legend mode, column letters for none mode. Returns a column-indexed
    /// array (index 0 = column A) with nulls for unmapped columns.
    /// </summary>
    private string?[] ResolveColumnIds(XLWorkbook workbook, IXLWorksheet worksheet, SheetLayout layout)
    {
        if (layout.Mode == SheetLayout.ModeNone)
        {
            int columnCount = worksheet.LastColumnUsed()?.ColumnNumber() ?? 0;
            var letterIds = new string?[columnCount];
            for (int c = 0; c < columnCount; c++)
            {
                letterIds[c] = XLHelper.GetColumnLetterFromNumber(c + 1);
            }
            return letterIds;
        }

        if (layout.Mode == SheetLayout.ModeLegend)
        {
            if (string.IsNullOrEmpty(layout.LegendSheet))
            {
                throw new ArgumentException(
                    $"Sheet '{worksheet.Name}' is in legend mode but legend_sheet is not configured");
            }
            if (!workbook.TryGetWorksheet(layout.LegendSheet, out var legend) || legend == null)
            {
                throw new ArgumentException($"Legend sheet '{layout.LegendSheet}' is not configured");
            }
            var byColumn = new Dictionary<int, string>();
            int maxCol = 0;
            foreach (var row in legend.RowsUsed())
            {
                var letter = row.Cell(1).GetString();
                var id = row.Cell(2).GetString();
                if (string.IsNullOrEmpty(letter))
                {
                    continue;
                }
                int colIndex = XLHelper.GetColumnNumberFromLetter(letter);
                if (colIndex > 0 && !string.IsNullOrEmpty(id))
                {
                    byColumn[colIndex] = id;
                    maxCol = Math.Max(maxCol, colIndex);
                }
            }
            var ids = new string?[maxCol];
            foreach (var kv in byColumn)
            {
                ids[kv.Key - 1] = kv.Value;
            }
            return ids;
        }

        var headerRow = worksheet.Row(layout.IdentifierRow);
        int lastCol = headerRow.LastCellUsed()?.Address.ColumnNumber ?? 0;
        var rowIds = new string?[lastCol];
        foreach (var cell in headerRow.Cells())
        {
            var text = cell.GetString();
            if (!string.IsNullOrEmpty(text))
            {
                rowIds[cell.Address.ColumnNumber - 1] = text;
            }
        }
        return rowIds;
    }

    private CellData ApplyWriteCell(IXLWorksheet worksheet, string cellRef, object? value)
    {
        var cell = worksheet.Cell(cellRef);
        SetCellValue(cell, value);
        return ConvertCell(cell, "native");
    }

    private CellData ApplyClearCell(IXLWorksheet worksheet, string cellRef)
    {
        var cell = worksheet.Cell(cellRef);
        cell.Clear();
        return ConvertCell(cell, "native");
    }

    private RecordItem ApplyAddRecord(
        IXLWorksheet worksheet,
        Dictionary<string, object> data,
        SheetLayout layout,
        string?[] headers,
        int? afterRow,
        int? copyStyleFrom)
    {
        if (afterRow.HasValue && afterRow.Value < 0)
        {
            throw new ArgumentException($"Record index {afterRow.Value} out of range");
        }
        int newRowNumber = afterRow.HasValue
            ? layout.FirstDataRow + afterRow.Value
            : worksheet.LastRowUsed()?.RowNumber() + 1 ?? layout.FirstDataRow;
        if (afterRow.HasValue && worksheet.LastRowUsed() != null && newRowNumber <= worksheet.LastRowUsed().RowNumber())
        {
            worksheet.Row(newRowNumber - 1).InsertRowsBelow(1);
        }
        var newRow = worksheet.Row(newRowNumber);

        if (copyStyleFrom.HasValue)
        {
            var styleRow = worksheet.Row(layout.FirstDataRow + copyStyleFrom.Value - 1);
            foreach (var cell in styleRow.Cells())
            {
                newRow.Cell(cell.Address.ColumnNumber).Style = cell.Style;
            }
        }

        for (int i = 0; i < headers.Length; i++)
        {
            var header = headers[i];
            if (!string.IsNullOrEmpty(header) && data.ContainsKey(header))
            {
                var cell = newRow.Cell(i + 1);
                SetCellValue(cell, data[header]);
            }
        }

        return new RecordItem { Index = newRowNumber - layout.FirstDataRow + 1, Data = data };
    }

    private RecordItem ApplyUpdateRecord(IXLWorksheet worksheet, int recordIndex, Dictionary<string, object> data, SheetLayout layout, string?[] headers)
    {
        int excelRowNumber = layout.FirstDataRow + recordIndex - 1;
        if (recordIndex < 1 || worksheet.LastRowUsed() == null || excelRowNumber > worksheet.LastRowUsed().RowNumber())
        {
            throw new ArgumentException($"Record index {recordIndex} out of range");
        }
        var row = worksheet.Row(excelRowNumber);

        for (int i = 0; i < headers.Length; i++)
        {
            var header = headers[i];
            if (!string.IsNullOrEmpty(header) && data.ContainsKey(header))
            {
                var cell = row.Cell(i + 1);
                SetCellValue(cell, data[header]);
            }
        }

        return new RecordItem { Index = recordIndex, Data = data };
    }

    private void ApplyDeleteRecord(IXLWorksheet worksheet, int recordIndex, SheetLayout layout)
    {
        int excelRowNumber = layout.FirstDataRow + recordIndex - 1;
        if (recordIndex < 1 || worksheet.LastRowUsed() == null || excelRowNumber > worksheet.LastRowUsed().RowNumber())
        {
            throw new ArgumentException($"Record index {recordIndex} out of range");
        }
        worksheet.Row(excelRowNumber).Delete();
    }

    public RecordItem AddRecord(string filePath, string sheetName, Dictionary<string, object> data, SheetHeaderConfig? sheetConfig, int? afterRow, int? copyStyleFrom)
    {
        using var workbook = new XLWorkbook(filePath);
        var worksheet = GetWorksheetOrThrow(workbook, sheetName);

        var layout = SheetLayout.Resolve(sheetConfig);
        var record = ApplyAddRecord(worksheet, data, layout, ResolveColumnIds(workbook, worksheet, layout), afterRow, copyStyleFrom);

        workbook.Save();

        return record;
    }

    public RecordItem UpdateRecord(string filePath, string sheetName, int recordIndex, Dictionary<string, object> data, SheetHeaderConfig? sheetConfig)
    {
        using var workbook = new XLWorkbook(filePath);
        var worksheet = GetWorksheetOrThrow(workbook, sheetName);

        var layout = SheetLayout.Resolve(sheetConfig);
        var record = ApplyUpdateRecord(worksheet, recordIndex, data, layout, ResolveColumnIds(workbook, worksheet, layout));

        workbook.Save();

        return record;
    }

    public void DeleteRecord(string filePath, string sheetName, int recordIndex, SheetHeaderConfig? sheetConfig)
    {
        using var workbook = new XLWorkbook(filePath);
        var worksheet = GetWorksheetOrThrow(workbook, sheetName);

        var layout = SheetLayout.Resolve(sheetConfig);
        ApplyDeleteRecord(worksheet, recordIndex, layout);

        workbook.Save();
    }

    /// <summary>
    /// Applies a batch of cell operations (op: update|clear, ref, value)
    /// within a single workbook open/save cycle.
    /// </summary>
    public List<Dictionary<string, object>> BatchCellOperations(
        string filePath,
        string sheetName,
        List<Dictionary<string, object?>> operations)
    {
        using var workbook = new XLWorkbook(filePath);
        var worksheet = GetWorksheetOrThrow(workbook, sheetName);
        var results = new List<Dictionary<string, object>>();

        foreach (var operation in operations)
        {
            var entry = new Dictionary<string, object>();
            var op = operation.TryGetValue("op", out var opValue) ? opValue?.ToString() ?? "update" : "update";
            entry["op"] = op;
            try
            {
                var cellRef = operation.TryGetValue("ref", out var refValue)
                    ? refValue?.ToString() ?? ""
                    : "";
                if (op == "clear")
                {
                    ApplyClearCell(worksheet, cellRef);
                }
                else if (op == "update")
                {
                    operation.TryGetValue("value", out var value);
                    ApplyWriteCell(
                        worksheet,
                        cellRef,
                        value is System.Text.Json.JsonElement je ? UnwrapJsonValue(je) : value);
                }
                else
                {
                    throw new ArgumentException($"Unsupported cell operation '{op}'");
                }
                entry["status"] = "ok";
            }
            catch (Exception ex)
            {
                entry["status"] = "error";
                entry["error"] = ex.Message;
            }
            results.Add(entry);
        }

        if (results.Any(r => r["status"] as string == "ok"))
        {
            workbook.Save();
        }

        return results;
    }

    /// <summary>
    /// Applies a batch of record operations (op: add|update|delete,
    /// row_index, data, copy_style_from) within a single open/save cycle.
    /// </summary>
    public List<Dictionary<string, object>> BatchRecordOperations(
        string filePath,
        string sheetName,
        List<Dictionary<string, object?>> operations,
        SheetHeaderConfig? sheetConfig)
    {
        using var workbook = new XLWorkbook(filePath);
        var worksheet = GetWorksheetOrThrow(workbook, sheetName);
        var layout = SheetLayout.Resolve(sheetConfig);
        var headers = ResolveColumnIds(workbook, worksheet, layout);
        var results = new List<Dictionary<string, object>>();

        foreach (var operation in operations)
        {
            var entry = new Dictionary<string, object>();
            var op = operation.TryGetValue("op", out var opValue) ? opValue?.ToString() ?? "" : "";
            entry["op"] = op;
            try
            {
                int? rowIndex = ToNullableInt(operation.TryGetValue("row_index", out var ri) ? ri : null);
                int? copyStyleFrom = ToNullableInt(operation.TryGetValue("copy_style_from", out var csf) ? csf : null);
                var data = ToDataMap(operation.TryGetValue("data", out var dataValue) ? dataValue : null);

                switch (op)
                {
                    case "add":
                        entry["index"] = ApplyAddRecord(worksheet, data, layout, headers, rowIndex, copyStyleFrom).Index;
                        break;
                    case "update":
                        if (!rowIndex.HasValue)
                        {
                            throw new ArgumentException("update operation requires row_index");
                        }
                        ApplyUpdateRecord(worksheet, rowIndex.Value, data, layout, headers);
                        entry["index"] = rowIndex.Value;
                        break;
                    case "delete":
                        if (!rowIndex.HasValue)
                        {
                            throw new ArgumentException("delete operation requires row_index");
                        }
                        ApplyDeleteRecord(worksheet, rowIndex.Value, layout);
                        entry["index"] = rowIndex.Value;
                        break;
                    default:
                        throw new ArgumentException($"Unsupported record operation '{op}'");
                }
                entry["status"] = "ok";
            }
            catch (Exception ex)
            {
                entry["status"] = "error";
                entry["error"] = ex.Message;
            }
            results.Add(entry);
        }

        if (results.Any(r => r["status"] as string == "ok"))
        {
            workbook.Save();
        }

        return results;
    }

    private static int? ToNullableInt(object? value)
    {
        return value switch
        {
            null => null,
            int i => i,
            long l => (int)l,
            double d => (int)d,
            System.Text.Json.JsonElement je when je.ValueKind == System.Text.Json.JsonValueKind.Number => je.GetInt32(),
            _ => null
        };
    }

    private static Dictionary<string, object> ToDataMap(object? value)
    {
        var data = new Dictionary<string, object>();
        switch (value)
        {
            case System.Text.Json.JsonElement je when je.ValueKind == System.Text.Json.JsonValueKind.Object:
                foreach (var property in je.EnumerateObject())
                {
                    var unwrapped = UnwrapJsonValue(property.Value);
                    if (unwrapped != null)
                    {
                        data[property.Name] = unwrapped;
                    }
                }
                break;
            case Dictionary<string, object?> dict:
                foreach (var kv in dict)
                {
                    if (kv.Value != null)
                    {
                        data[kv.Key] = kv.Value;
                    }
                }
                break;
        }
        return data;
    }

    internal static object? UnwrapJsonValue(System.Text.Json.JsonElement element)
    {
        return element.ValueKind switch
        {
            System.Text.Json.JsonValueKind.String => element.GetString(),
            System.Text.Json.JsonValueKind.Number => element.TryGetInt32(out var i) ? i : element.GetDouble(),
            System.Text.Json.JsonValueKind.True => true,
            System.Text.Json.JsonValueKind.False => false,
            System.Text.Json.JsonValueKind.Null => null,
            System.Text.Json.JsonValueKind.Undefined => null,
            _ => element.ToString()
        };
    }

    public SheetMetadata GetSheetMetadata(string filePath, string sheetName, SheetHeaderConfig? sheetConfig)
    {
        using var workbook = new XLWorkbook(filePath);
        var worksheet = workbook.Worksheet(sheetName);

        if (worksheet == null)
        {
            throw new ArgumentException($"Sheet '{sheetName}' not found");
        }

        int rowCount = worksheet.LastRowUsed()?.RowNumber() ?? 0;
        int columnCount = worksheet.LastColumnUsed()?.ColumnNumber() ?? 0;
        var layout = SheetLayout.Resolve(sheetConfig);

        return new SheetMetadata
        {
            Name = sheetName,
            RowCount = rowCount,
            ColumnCount = columnCount,
            Mode = layout.Mode == SheetLayout.ModeNone ? "raw" : "table",
            HeaderRow = layout.IdentifierRow,
            FirstDataRow = layout.FirstDataRow
        };
    }

    public ColumnDefinitionsResponse GetColumnDefinitions(string filePath, string sheetName, SheetHeaderConfig? sheetConfig)
    {
        using var workbook = new XLWorkbook(filePath);
        var worksheet = workbook.Worksheet(sheetName);

        if (worksheet == null)
        {
            throw new ArgumentException($"Sheet '{sheetName}' not found");
        }

        var layout = SheetLayout.Resolve(sheetConfig);
        var ids = ResolveColumnIds(workbook, worksheet, layout);
        var columns = new List<ColumnDefinition>();

        for (int c = 0; c < ids.Length; c++)
        {
            var id = ids[c];
            if (string.IsNullOrEmpty(id))
            {
                continue;
            }
            var column = new ColumnDefinition
            {
                Index = c + 1,
                Letter = XLHelper.GetColumnLetterFromNumber(c + 1),
                Id = id,
                Type = "string",
                NumberFormat = null
            };
            if (layout.TypeRow > 0)
            {
                var typeText = worksheet.Row(layout.TypeRow).Cell(c + 1).GetString();
                if (!string.IsNullOrEmpty(typeText))
                {
                    column.Type = typeText;
                }
            }
            if (layout.DescriptionRow > 0)
            {
                var description = worksheet.Row(layout.DescriptionRow).Cell(c + 1).GetString();
                if (!string.IsNullOrEmpty(description))
                {
                    column.Descriptions = new Dictionary<string, string> { ["default"] = description };
                }
            }
            columns.Add(column);
        }

        return new ColumnDefinitionsResponse
        {
            Source = layout.Mode == SheetLayout.ModeLegend ? "legend_sheet"
                : layout.Mode == SheetLayout.ModeMulti ? "multi_row"
                : "header_row",
            Columns = columns
        };
    }

    private void SetCellValue(IXLCell cell, object? value)
    {
        if (value == null)
        {
            cell.Clear();
        }
        else if (value is string s)
        {
            cell.Value = s;
        }
        else if (value is double d)
        {
            cell.Value = d;
        }
        else if (value is int i)
        {
            cell.Value = i;
        }
        else if (value is bool b)
        {
            cell.Value = b;
        }
        else if (value is DateTime dt)
        {
            cell.Value = dt;
        }
        else
        {
            cell.Value = value.ToString();
        }
    }
}

public class CellData
{
    public string Ref { get; set; } = "";
    public string Column { get; set; } = "";
    public int Row { get; set; }
    public object Value { get; set; } = "";
    public string Type { get; set; } = "";
    public string? NumberFormat { get; set; }
    public bool IsFormula { get; set; }
    public string? Formatted { get; set; }
}

public class RangeData
{
    public string Range { get; set; } = "";
    public List<RangeRow> Rows { get; set; } = new List<RangeRow>();
}

public class RangeRow
{
    public int Row { get; set; }
    public List<CellData> Cells { get; set; } = new List<CellData>();
}

public class RecordItem
{
    public int Index { get; set; }
    public Dictionary<string, object> Data { get; set; } = new Dictionary<string, object>();
}

public class RecordListResponse
{
    public List<RecordItem> Items { get; set; } = new List<RecordItem>();
    public int Total { get; set; }
    public int Offset { get; set; }
    public int Limit { get; set; }
    public string Format { get; set; } = "";
}

public class SheetMetadata
{
    public string Name { get; set; } = "";
    public int RowCount { get; set; }
    public int ColumnCount { get; set; }
    public string Mode { get; set; } = "";
    public int HeaderRow { get; set; }
    public int FirstDataRow { get; set; }
}

public class ColumnDefinition
{
    public int Index { get; set; }
    public string Letter { get; set; } = "";
    public string Id { get; set; } = "";
    public string Type { get; set; } = "";
    public string? NumberFormat { get; set; }
    public Dictionary<string, string>? Descriptions { get; set; }
}

public class ColumnDefinitionsResponse
{
    public string Source { get; set; } = "";
    public List<ColumnDefinition> Columns { get; set; } = new List<ColumnDefinition>();
}

