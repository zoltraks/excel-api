using BigBytes.ExcelApi.Excel;
using BigBytes.ExcelApi.Services;
using Microsoft.AspNetCore.Routing;

namespace BigBytes.ExcelApi.Endpoints;

public static class WorkbookEndpoints
{
    public static void MapWorkbookEndpoints(this IEndpointRouteBuilder app, WorkbookConfig workbookConfig, ExcelService excelService)
    {
        app.MapGet("/workbooks", () =>
        {
            var workbooks = workbookConfig.Workbooks
                .Where(e => File.Exists(e.Path))
                .Select(e => new
                {
                    id = e.Id,
                    filename = e.Path,
                    @readonly = e.Readonly,
                    modified_at = File.GetLastWriteTime(e.Path).ToString("o"),
                    size_bytes = new FileInfo(e.Path).Length
                })
                .ToList();

            return Results.Ok(new
            {
                items = workbooks,
                total = workbooks.Count()
            });
        });

        app.MapGet("/workbooks/{id}", (string id) =>
        {
            var entry = workbookConfig.Workbooks.FirstOrDefault(w => w.Id == id);
            if (entry == null || !File.Exists(entry.Path))
            {
                return Results.NotFound(new { error = "WORKBOOK_NOT_FOUND", message = $"Workbook with ID '{id}' not found" });
            }

            var fileInfo = new FileInfo(entry.Path);
            var sheets = excelService.ReadSheetNames(entry.Path);

            return Results.Ok(new
            {
                id = entry.Id,
                filename = entry.Path,
                @readonly = entry.Readonly,
                modified_at = fileInfo.LastWriteTime.ToString("o"),
                size_bytes = fileInfo.Length,
                sheets = sheets
            });
        });

        app.MapGet("/workbooks/{id}/lock-status", (string id) =>
        {
            var entry = workbookConfig.Workbooks.FirstOrDefault(w => w.Id == id);
            if (entry == null)
            {
                return Results.NotFound(new { error = "WORKBOOK_NOT_FOUND", message = $"Workbook with ID '{id}' not found" });
            }

            return Results.Ok(new
            {
                locked = false,
                queue_depth = 0
            });
        });
    }
}
