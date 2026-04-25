using BigBytes.ExcelApi.Excel;
using BigBytes.ExcelApi.Services;
using Microsoft.AspNetCore.Routing;

namespace BigBytes.ExcelApi.Endpoints;

public static class SheetEndpoints
{
    public static void MapSheetEndpoints(this IEndpointRouteBuilder app, WorkbookConfig workbookConfig, ExcelService excelService)
    {
        app.MapGet("/workbooks/{id}/sheets/{sheetName}", (string id, string sheetName) =>
        {
            var entry = workbookConfig.Workbooks.FirstOrDefault(w => w.Id == id);
            if (entry == null)
            {
                return Results.NotFound(new { error = "WORKBOOK_NOT_FOUND", message = $"Workbook with ID '{id}' not found" });
            }

            var metadata = excelService.GetSheetMetadata(entry.Path, sheetName);

            return Results.Ok(metadata);
        });

        app.MapGet("/workbooks/{id}/sheets/{sheetName}/columns", (string id, string sheetName) =>
        {
            var entry = workbookConfig.Workbooks.FirstOrDefault(w => w.Id == id);
            if (entry == null)
            {
                return Results.NotFound(new { error = "WORKBOOK_NOT_FOUND", message = $"Workbook with ID '{id}' not found" });
            }

            var columns = excelService.GetColumnDefinitions(entry.Path, sheetName);

            return Results.Ok(columns);
        });
    }
}
