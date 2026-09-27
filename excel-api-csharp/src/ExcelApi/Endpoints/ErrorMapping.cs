using BigBytes.ExcelApi.Services;

namespace BigBytes.ExcelApi.Endpoints;

public static class ErrorMapping
{
    public static IResult ReadonlyWorkbook()
    {
        return Results.Json(
            new { error = "READONLY_WORKBOOK", message = "Workbook is readonly" },
            statusCode: StatusCodes.Status422UnprocessableEntity);
    }

    public static IResult ServiceBusy(ServiceBusyException ex)
    {
        return Results.Json(
            new { error = "SERVICE_BUSY", message = ex.Message },
            statusCode: StatusCodes.Status503ServiceUnavailable);
    }

    public static IResult FileLocked(InvalidOperationException ex)
    {
        return Results.Json(
            new { error = "FILE_LOCKED", message = ex.Message },
            statusCode: StatusCodes.Status409Conflict);
    }

    public static IResult FromException(ArgumentException ex)
    {
        var message = ex.Message;
        if (message.Contains("out of range"))
        {
            return Results.NotFound(new { error = "ROW_NOT_FOUND", message });
        }
        if (message.Contains("not configured"))
        {
            return Results.BadRequest(new { error = "SHEET_NOT_CONFIGURED", message });
        }
        if (message.Contains("not found"))
        {
            return Results.NotFound(new { error = "SHEET_NOT_FOUND", message });
        }
        return Results.BadRequest(new { error = "INVALID_REQUEST", message });
    }
}
