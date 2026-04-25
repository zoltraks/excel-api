using BigBytes.ExcelApi.Dto;
using BigBytes.ExcelApi.Excel;
using BigBytes.ExcelApi.Services;
using Microsoft.AspNetCore.Routing;

namespace BigBytes.ExcelApi.Endpoints;

public static class CellEndpoints
{
    public static void MapCellEndpoints(this IEndpointRouteBuilder app, WorkbookConfig workbookConfig, ExcelService excelService)
    {
        app.MapGet("/workbooks/{id}/sheets/{sheetName}/cells/{cellRef}", (string id, string sheetName, string cellRef, string format = "native") =>
        {
            var entry = workbookConfig.Workbooks.FirstOrDefault(w => w.Id == id);
            if (entry == null)
            {
                return Results.NotFound(new { error = "WORKBOOK_NOT_FOUND", message = $"Workbook with ID '{id}' not found" });
            }

            var cellData = excelService.ReadCell(entry.Path, sheetName, cellRef, format);

            return Results.Ok(new
            {
                value = cellData.Value,
                type = cellData.Type,
                number_format = cellData.NumberFormat,
                is_formula = cellData.IsFormula,
                formatted = cellData.Formatted
            });
        });

        app.MapGet("/workbooks/{id}/sheets/{sheetName}/ranges/{rangeRef}", (string id, string sheetName, string rangeRef, string format = "native") =>
        {
            var entry = workbookConfig.Workbooks.FirstOrDefault(w => w.Id == id);
            if (entry == null)
            {
                return Results.NotFound(new { error = "WORKBOOK_NOT_FOUND", message = $"Workbook with ID '{id}' not found" });
            }

            var rangeData = excelService.ReadRange(entry.Path, sheetName, rangeRef, format);

            return Results.Ok(rangeData);
        });

        app.MapPut("/workbooks/{id}/sheets/{sheetName}/cells/{cellRef}", (string id, string sheetName, string cellRef, WriteCellRequest request) =>
        {
            var entry = workbookConfig.Workbooks.FirstOrDefault(w => w.Id == id);
            if (entry == null)
            {
                return Results.NotFound(new { error = "WORKBOOK_NOT_FOUND", message = $"Workbook with ID '{id}' not found" });
            }

            if (entry.Readonly)
            {
                return Results.StatusCode(422);
            }

            var value = request.Value;
            var cellData = excelService.WriteCell(entry.Path, sheetName, cellRef, value);

            return Results.Ok(new
            {
                value = cellData.Value,
                type = cellData.Type,
                number_format = cellData.NumberFormat,
                is_formula = cellData.IsFormula,
                formatted = cellData.Formatted
            });
        });
    }
}
