using BigBytes.ExcelApi.Dto;
using BigBytes.ExcelApi.Excel;
using BigBytes.ExcelApi.Services;
using Microsoft.AspNetCore.Routing;

namespace BigBytes.ExcelApi.Endpoints;

public static class CellEndpoints
{
    public static void MapCellEndpoints(this IEndpointRouteBuilder app, WorkbookConfig workbookConfig, ExcelService excelService, FileLockService fileLockService, WriteQueueService writeQueueService)
    {
        app.MapGet("/workbooks/{id}/sheets/{sheetName}/cells/{cellRef}", (string id, string sheetName, string cellRef, string format = "native") =>
        {
            var entry = workbookConfig.Workbooks.FirstOrDefault(w => w.Id == id);
            if (entry == null)
            {
                return Results.NotFound(new { error = "WORKBOOK_NOT_FOUND", message = $"Workbook with ID '{id}' not found" });
            }

            try
            {
                return Results.Ok(excelService.ReadCell(entry.Path, sheetName, cellRef, format));
            }
            catch (ArgumentException ex)
            {
                return ErrorMapping.FromException(ex);
            }
        });

        app.MapGet("/workbooks/{id}/sheets/{sheetName}/ranges/{rangeRef}", (string id, string sheetName, string rangeRef, string format = "native") =>
        {
            var entry = workbookConfig.Workbooks.FirstOrDefault(w => w.Id == id);
            if (entry == null)
            {
                return Results.NotFound(new { error = "WORKBOOK_NOT_FOUND", message = $"Workbook with ID '{id}' not found" });
            }

            try
            {
                return Results.Ok(excelService.ReadRange(entry.Path, sheetName, rangeRef, format));
            }
            catch (ArgumentException ex)
            {
                return ErrorMapping.FromException(ex);
            }
        });

        app.MapPut("/workbooks/{id}/sheets/{sheetName}/cells/{cellRef}", async (string id, string sheetName, string cellRef, System.Text.Json.Nodes.JsonObject? request) =>
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

            if (request == null || !request.ContainsKey("value"))
            {
                return Results.BadRequest(new { error = "INVALID_REQUEST", message = "'value' is required" });
            }
            var value = request["value"] is { } node
                ? ExcelService.UnwrapJsonValue(node.Deserialize<System.Text.Json.JsonElement>())
                : null;

            try
            {
                return await writeQueueService.SubmitAsync<IResult>(id, async () =>
                {
                    await fileLockService.AcquireAsync(id);
                    try
                    {
                        return Results.Ok(excelService.WriteCell(entry.Path, sheetName, cellRef, value));
                    }
                    catch (ArgumentException ex)
                    {
                        return ErrorMapping.FromException(ex);
                    }
                    finally
                    {
                        fileLockService.Release(id);
                    }
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
        });

        app.MapPost("/workbooks/{id}/sheets/{sheetName}/cells/operations", async (string id, string sheetName, BatchCellRequest request) =>
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
                        return excelService.BatchCellOperations(entry.Path, sheetName, request.Operations);
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
