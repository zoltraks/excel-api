using BigBytes.ExcelApi.Dto;
using BigBytes.ExcelApi.Excel;
using BigBytes.ExcelApi.Services;
using Microsoft.AspNetCore.Routing;

namespace BigBytes.ExcelApi.Endpoints;

public static class RecordEndpoints
{
    public static void MapRecordEndpoints(this IEndpointRouteBuilder app, WorkbookConfig workbookConfig, ExcelService excelService, FileLockService fileLockService, WriteQueueService writeQueueService)
    {
        app.MapGet("/workbooks/{id}/sheets/{sheetName}/records", (string id, string sheetName, int offset = 0, int limit = 100, string format = "native") =>
        {
            var entry = workbookConfig.Workbooks.FirstOrDefault(w => w.Id == id);
            if (entry == null)
            {
                return Results.NotFound(new { error = "WORKBOOK_NOT_FOUND", message = $"Workbook with ID '{id}' not found" });
            }

            try
            {
                var records = excelService.ReadRecords(entry.Path, sheetName, entry.GetSheetConfig(sheetName), offset, limit, format);

                return Results.Ok(records);
            }
            catch (ArgumentException ex)
            {
                return ErrorMapping.FromException(ex);
            }
        });

        app.MapGet("/workbooks/{id}/sheets/{sheetName}/records/{recordIndex}", (string id, string sheetName, int recordIndex, string format = "native") =>
        {
            var entry = workbookConfig.Workbooks.FirstOrDefault(w => w.Id == id);
            if (entry == null)
            {
                return Results.NotFound(new { error = "WORKBOOK_NOT_FOUND", message = $"Workbook with ID '{id}' not found" });
            }

            try
            {
                var record = excelService.ReadRecord(entry.Path, sheetName, recordIndex, entry.GetSheetConfig(sheetName), format);

                return Results.Ok(record);
            }
            catch (ArgumentException ex)
            {
                return ErrorMapping.FromException(ex);
            }
        });

        app.MapPost("/workbooks/{id}/sheets/{sheetName}/records", async (string id, string sheetName, AddRecordRequest request) =>
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

            if (request.Data == null)
            {
                return Results.BadRequest(new { error = "INVALID_REQUEST", message = "'data' is required and must be an object" });
            }
            var data = request.Data;
            int? afterRow = request.AfterRow;
            int? copyStyleFrom = request.CopyStyleFrom;

            try
            {
                return await writeQueueService.SubmitAsync<IResult>(id, async () =>
                {
                    await fileLockService.AcquireAsync(id);
                    try
                    {
                        var record = excelService.AddRecord(entry.Path, sheetName, data, entry.GetSheetConfig(sheetName), afterRow, copyStyleFrom);
                        return Results.Json(record, statusCode: StatusCodes.Status201Created);
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

        app.MapPut("/workbooks/{id}/sheets/{sheetName}/records/{recordIndex}", async (string id, string sheetName, int recordIndex, UpdateRecordRequest request) =>
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

            if (request.Data == null)
            {
                return Results.BadRequest(new { error = "INVALID_REQUEST", message = "'data' is required and must be an object" });
            }
            var data = request.Data;

            try
            {
                return await writeQueueService.SubmitAsync<IResult>(id, async () =>
                {
                    await fileLockService.AcquireAsync(id);
                    try
                    {
                        var record = excelService.UpdateRecord(entry.Path, sheetName, recordIndex, data, entry.GetSheetConfig(sheetName));
                        return Results.Ok(record);
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

        app.MapDelete("/workbooks/{id}/sheets/{sheetName}/records/{recordIndex}", async (string id, string sheetName, int recordIndex) =>
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

            try
            {
                return await writeQueueService.SubmitAsync<IResult>(id, async () =>
                {
                    await fileLockService.AcquireAsync(id);
                    try
                    {
                        excelService.DeleteRecord(entry.Path, sheetName, recordIndex, entry.GetSheetConfig(sheetName));
                        return Results.NoContent();
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
    }
}
