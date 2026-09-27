using BigBytes.ExcelApi.Dto;
using BigBytes.ExcelApi.Excel;
using BigBytes.ExcelApi.Services;
using Microsoft.AspNetCore.Routing;

namespace BigBytes.ExcelApi.Endpoints;

public static class OperationsEndpoints
{
    public static void MapOperationsEndpoints(this IEndpointRouteBuilder app, WorkbookConfig workbookConfig, ExcelService excelService, FileLockService fileLockService, WriteQueueService writeQueueService)
    {
        app.MapPost("/workbooks/{id}/sheets/{sheetName}/operations", async (string id, string sheetName, BatchRecordRequest request) =>
        {
            var entry = workbookConfig.Workbooks.FirstOrDefault(w => w.Id == id);
            if (entry == null)
            {
                return Results.NotFound(new { error = "WORKBOOK_NOT_FOUND", message = $"Workbook with ID '{id}' not found" });
            }

            if (entry.Readonly)
            {
                return ErrorMapping.ReadonlyWorkbook();
            }

            if (request.Operations == null || request.Operations.Count == 0)
            {
                return Results.BadRequest(new { error = "INVALID_REQUEST", message = "Request body must contain a non-empty operations array" });
            }

            try
            {
                var results = await writeQueueService.SubmitAsync(id, async () =>
                {
                    await fileLockService.AcquireAsync(id);
                    try
                    {
                        return excelService.BatchRecordOperations(entry.Path, sheetName, request.Operations, entry.GetSheetConfig(sheetName));
                    }
                    finally
                    {
                        fileLockService.Release(id);
                    }
                });

                return Results.Ok(new
                {
                    results,
                    applied_at = DateTime.UtcNow.ToString("o")
                });
            }
            catch (ServiceBusyException ex)
            {
                return ErrorMapping.ServiceBusy(ex);
            }
            catch (InvalidOperationException ex)
            {
                return ErrorMapping.FileLocked(ex);
            }
            catch (ArgumentException ex)
            {
                return ErrorMapping.FromException(ex);
            }
        });
    }
}
