using ClosedXML.Excel;
using System.Collections;

namespace BigBytes.ExcelApi.Services;

public class ExcelService
{
    public List<SheetInfo> ReadSheetNames(string filePath)
    {
        using var workbook = new XLWorkbook(filePath);
        var sheets = new List<SheetInfo>();

        for (int i = 0; i < workbook.Worksheets.Count; i++)
        {
            var worksheet = workbook.Worksheet(i);
            // 1-based indexing
            sheets.Add(new SheetInfo { Name = worksheet.Name, Index = i + 1 });
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

    public CellData[,] ReadRange(string filePath, string sheetName, string rangeRef, string format)
    {
        using var workbook = new XLWorkbook(filePath);
        var worksheet = workbook.Worksheet(sheetName);

        if (worksheet == null)
        {
            throw new ArgumentException($"Sheet '{sheetName}' not found");
        }

        var range = worksheet.Range(rangeRef);
        var rowCount = range.RowCount();
        var colCount = range.ColumnCount();

        var data = new CellData[rowCount, colCount];

        for (int r = 1; r <= rowCount; r++)
        {
            for (int c = 1; c <= colCount; c++)
            {
                var cell = range.Cell(r, c);
                data[r - 1, c - 1] = ConvertCell(cell, format);
            }
        }

        return data;
    }

    public RecordListResponse ReadRecords(string filePath, string sheetName, int headerRowCount, int offset, int limit, string format)
    {
        using var workbook = new XLWorkbook(filePath);
        var worksheet = workbook.Worksheet(sheetName);

        if (worksheet == null)
        {
            throw new ArgumentException($"Sheet '{sheetName}' not found");
        }

        var headerRow = worksheet.Row(headerRowCount);
        var headers = new List<string>();

        foreach (var cell in headerRow.Cells())
        {
            if (!string.IsNullOrEmpty(cell.GetString()))
            {
                headers.Add(cell.GetString());
            }
        }

        int firstDataRow = headerRowCount + 1;
        var lastRowUsed = worksheet.LastRowUsed();
        int lastRow = lastRowUsed != null ? lastRowUsed.RowNumber() : 0;
        int totalDataRows = Math.Max(0, lastRow - headerRowCount);

        int startRow = firstDataRow + offset;
        int endRow = Math.Min(startRow + limit - 1, lastRow);

        var items = new List<RecordItem>();

        for (int r = startRow; r <= endRow; r++)
        {
            var row = worksheet.Row(r);
            var data = new Dictionary<string, object>();

            for (int c = 0; c < headers.Count; c++)
            {
                var cell = row.Cell(c + 1);
                var header = headers[c];
                if (!string.IsNullOrEmpty(header))
                {
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

    public RecordItem ReadRecord(string filePath, string sheetName, int recordIndex, int headerRowCount, string format)
    {
        using var workbook = new XLWorkbook(filePath);
        var worksheet = workbook.Worksheet(sheetName);

        if (worksheet == null)
        {
            throw new ArgumentException($"Sheet '{sheetName}' not found");
        }

        var headerRow = worksheet.Row(headerRowCount);
        var headers = new List<string>();

        foreach (var cell in headerRow.Cells())
        {
            if (!string.IsNullOrEmpty(cell.GetString()))
            {
                headers.Add(cell.GetString());
            }
        }

        // Convert 1-based record index to Excel row number
        int excelRowNumber = headerRowCount + recordIndex;
        var lastRowUsed = worksheet.LastRowUsed();
        int lastRow = lastRowUsed != null ? lastRowUsed.RowNumber() : 0;

        if (excelRowNumber > lastRow)
        {
            throw new ArgumentException($"Record index {recordIndex} out of range");
        }

        var row = worksheet.Row(excelRowNumber);
        var data = new Dictionary<string, object>();

        for (int c = 0; c < headers.Count; c++)
        {
            var cell = row.Cell(c + 1);
            var header = headers[c];
            if (!string.IsNullOrEmpty(header))
            {
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
        var formatted = format == "display" ? cell.GetFormattedString() : "";

        return new CellData
        {
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
                return cell.GetTimeSpan();
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
                return cell.DataType == XLDataType.DateTime ? "date" : "number";
            case XLDataType.Boolean:
                return "boolean";
            case XLDataType.DateTime:
                return "date";
            case XLDataType.TimeSpan:
                return "timespan";
            default:
                return "string";
        }
    }

    public CellData WriteCell(string filePath, string sheetName, string cellRef, object? value)
    {
        var workbook = new XLWorkbook(filePath);
        var worksheet = workbook.Worksheet(sheetName);

        if (worksheet == null)
        {
            workbook.Dispose();
            throw new ArgumentException($"Sheet '{sheetName}' not found");
        }

        var cell = worksheet.Cell(cellRef);
        SetCellValue(cell, value);

        workbook.Save();
        workbook.Dispose();

        return ConvertCell(cell, "native");
    }

    public RecordItem AddRecord(string filePath, string sheetName, Dictionary<string, object> data, int? afterRow, int? copyStyleFrom)
    {
        var workbook = new XLWorkbook(filePath);
        var worksheet = workbook.Worksheet(sheetName);

        if (worksheet == null)
        {
            workbook.Dispose();
            throw new ArgumentException($"Sheet '{sheetName}' not found");
        }

        var headerRow = worksheet.Row(1);
        var headers = new List<string>();

        foreach (var cell in headerRow.Cells())
        {
            if (!string.IsNullOrEmpty(cell.GetString()))
            {
                headers.Add(cell.GetString());
            }
        }

        int newRowNumber = afterRow.HasValue ? afterRow.Value + 1 : worksheet.LastRowUsed()?.RowNumber() + 1 ?? 2;
        var newRow = worksheet.Row(newRowNumber);

        if (copyStyleFrom.HasValue)
        {
            var styleRow = worksheet.Row(copyStyleFrom.Value);
            foreach (var cell in styleRow.Cells())
            {
                newRow.Cell(cell.Address.ColumnNumber).Style = cell.Style;
            }
        }

        for (int i = 0; i < headers.Count; i++)
        {
            var header = headers[i];
            if (data.ContainsKey(header))
            {
                var cell = newRow.Cell(i + 1);
                SetCellValue(cell, data[header]);
            }
        }

        workbook.Save();
        workbook.Dispose();

        return new RecordItem { Index = newRowNumber, Data = data };
    }

    public RecordItem UpdateRecord(string filePath, string sheetName, int recordIndex, Dictionary<string, object> data)
    {
        var workbook = new XLWorkbook(filePath);
        var worksheet = workbook.Worksheet(sheetName);

        if (worksheet == null)
        {
            workbook.Dispose();
            throw new ArgumentException($"Sheet '{sheetName}' not found");
        }

        var headerRow = worksheet.Row(1);
        var headers = new List<string>();

        foreach (var cell in headerRow.Cells())
        {
            if (!string.IsNullOrEmpty(cell.GetString()))
            {
                headers.Add(cell.GetString());
            }
        }

        int excelRowNumber = recordIndex + 1;
        var row = worksheet.Row(excelRowNumber);

        for (int i = 0; i < headers.Count; i++)
        {
            var header = headers[i];
            if (data.ContainsKey(header))
            {
                var cell = row.Cell(i + 1);
                SetCellValue(cell, data[header]);
            }
        }

        workbook.Save();
        workbook.Dispose();

        return new RecordItem { Index = recordIndex, Data = data };
    }

    public void DeleteRecord(string filePath, string sheetName, int recordIndex)
    {
        var workbook = new XLWorkbook(filePath);
        var worksheet = workbook.Worksheet(sheetName);

        if (worksheet == null)
        {
            workbook.Dispose();
            throw new ArgumentException($"Sheet '{sheetName}' not found");
        }

        int excelRowNumber = recordIndex + 1;
        worksheet.Row(excelRowNumber).Delete();

        workbook.Save();
        workbook.Dispose();
    }

    public SheetMetadata GetSheetMetadata(string filePath, string sheetName)
    {
        using var workbook = new XLWorkbook(filePath);
        var worksheet = workbook.Worksheet(sheetName);

        if (worksheet == null)
        {
            throw new ArgumentException($"Sheet '{sheetName}' not found");
        }

        int rowCount = worksheet.LastRowUsed()?.RowNumber() ?? 0;
        int columnCount = worksheet.LastColumnUsed()?.ColumnNumber() ?? 0;

        return new SheetMetadata
        {
            Name = sheetName,
            RowCount = rowCount,
            ColumnCount = columnCount,
            Mode = "raw",
            HeaderRow = 1,
            FirstDataRow = 2
        };
    }

    public ColumnDefinitionsResponse GetColumnDefinitions(string filePath, string sheetName)
    {
        using var workbook = new XLWorkbook(filePath);
        var worksheet = workbook.Worksheet(sheetName);

        if (worksheet == null)
        {
            throw new ArgumentException($"Sheet '{sheetName}' not found");
        }

        var headerRow = worksheet.Row(1);
        var columns = new List<ColumnDefinition>();

        foreach (var cell in headerRow.Cells())
        {
            if (!string.IsNullOrEmpty(cell.GetString()))
            {
                columns.Add(new ColumnDefinition
                {
                    Index = cell.Address.ColumnNumber,
                    Letter = cell.Address.ColumnLetter,
                    Id = cell.GetString(),
                    Type = "string",
                    NumberFormat = cell.Style.NumberFormat.Format
                });
            }
        }

        return new ColumnDefinitionsResponse
        {
            Source = "header_row",
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

public class SheetInfo
{
    public string Name { get; set; } = "";
    public int Index { get; set; }
}

public class CellData
{
    public object Value { get; set; } = "";
    public string Type { get; set; } = "";
    public string NumberFormat { get; set; } = "";
    public bool IsFormula { get; set; }
    public string Formatted { get; set; } = "";
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
    public string NumberFormat { get; set; } = "";
}

public class ColumnDefinitionsResponse
{
    public string Source { get; set; } = "";
    public List<ColumnDefinition> Columns { get; set; } = new List<ColumnDefinition>();
}

