namespace BigBytes.ExcelApi.Services;

/// <summary>
/// Thrown when a workbook does not contain the requested sheet.
/// </summary>
public class SheetNotFoundException(string sheetName)
    : ArgumentException($"Sheet '{sheetName}' not found")
{
    public string SheetName { get; } = sheetName;
}
