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

            try
            {
                var metadata = excelService.GetSheetMetadata(entry.Path, sheetName, entry.GetSheetConfig(sheetName));

                return Results.Ok(metadata);
            }
            catch (ArgumentException ex)
            {
                return ErrorMapping.FromException(ex);
            }
        });

        app.MapGet("/workbooks/{id}/sheets/{sheetName}/columns", (string id, string sheetName) =>
        {
            var entry = workbookConfig.Workbooks.FirstOrDefault(w => w.Id == id);
            if (entry == null)
            {
                return Results.NotFound(new { error = "WORKBOOK_NOT_FOUND", message = $"Workbook with ID '{id}' not found" });
            }

            try
            {
                var columns = excelService.GetColumnDefinitions(entry.Path, sheetName, entry.GetSheetConfig(sheetName));

                return Results.Ok(columns);
            }
            catch (ArgumentException ex)
            {
                return ErrorMapping.FromException(ex);
            }
        });
    }
}
