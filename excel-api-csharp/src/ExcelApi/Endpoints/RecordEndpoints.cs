using BigBytes.ExcelApi.Dto;
using BigBytes.ExcelApi.Excel;
using BigBytes.ExcelApi.Services;
using Microsoft.AspNetCore.Routing;

namespace BigBytes.ExcelApi.Endpoints;

public static class RecordEndpoints
{
    public static void MapRecordEndpoints(this IEndpointRouteBuilder app, WorkbookConfig workbookConfig, ExcelService excelService)
    {
        app.MapGet("/workbooks/{id}/sheets/{sheetName}/records", (string id, string sheetName, int offset = 0, int limit = 100, string format = "native") =>
        {
            var entry = workbookConfig.Workbooks.FirstOrDefault(w => w.Id == id);
            if (entry == null)
            {
                return Results.NotFound(new { error = "WORKBOOK_NOT_FOUND", message = $"Workbook with ID '{id}' not found" });
            }

            var records = excelService.ReadRecords(entry.Path, sheetName, 1, offset, limit, format);

            return Results.Ok(records);
        });

        app.MapGet("/workbooks/{id}/sheets/{sheetName}/records/{recordIndex}", (string id, string sheetName, int recordIndex, string format = "native") =>
        {
            var entry = workbookConfig.Workbooks.FirstOrDefault(w => w.Id == id);
            if (entry == null)
            {
                return Results.NotFound(new { error = "WORKBOOK_NOT_FOUND", message = $"Workbook with ID '{id}' not found" });
            }

            var record = excelService.ReadRecord(entry.Path, sheetName, recordIndex, 1, format);

            return Results.Ok(record);
        });

        app.MapPost("/workbooks/{id}/sheets/{sheetName}/records", (string id, string sheetName, AddRecordRequest request) =>
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

            var data = request.Data ?? new Dictionary<string, object>();
            int? afterRow = request.AfterRow;
            int? copyStyleFrom = request.CopyStyleFrom;

            var record = excelService.AddRecord(entry.Path, sheetName, data, afterRow, copyStyleFrom);

            return Results.Ok(record);
        });

        app.MapPut("/workbooks/{id}/sheets/{sheetName}/records/{recordIndex}", (string id, string sheetName, int recordIndex, UpdateRecordRequest request) =>
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

            var data = request.Data ?? new Dictionary<string, object>();
            var record = excelService.UpdateRecord(entry.Path, sheetName, recordIndex, data);

            return Results.Ok(record);
        });

        app.MapDelete("/workbooks/{id}/sheets/{sheetName}/records/{recordIndex}", (string id, string sheetName, int recordIndex) =>
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

            excelService.DeleteRecord(entry.Path, sheetName, recordIndex);

            return Results.NoContent();
        });
    }
}
