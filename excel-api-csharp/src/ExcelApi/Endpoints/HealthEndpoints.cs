using BigBytes.ExcelApi.Services;
using Microsoft.AspNetCore.Routing;

namespace BigBytes.ExcelApi.Endpoints;

public static class HealthEndpoints
{
    public static void MapHealthEndpoints(this IEndpointRouteBuilder app, DateTime startTime, MetricsCollector metricsCollector)
    {
        app.MapGet("/health", () =>
        {
            var now = DateTime.UtcNow;
            var uptimeSeconds = (long)(now - startTime).TotalSeconds;
            var serverTime = now.ToString("o");
            var localTz = TimeZoneInfo.Local;
            string timezone;
            if (localTz.HasIanaId)
            {
                timezone = localTz.Id;
            }
            else if (TimeZoneInfo.TryConvertWindowsIdToIanaId(localTz.Id, out string? ianaId))
            {
                timezone = ianaId;
            }
            else
            {
                timezone = localTz.Id;
            }

            return Results.Ok(new
            {
                status = "ok",
                implementation = "excel-api-csharp",
                version = "0.0.3",
                uptime_seconds = uptimeSeconds,
                server_time = serverTime,
                timezone = timezone
            });
        });

        app.MapGet("/metrics", () => Results.Text(metricsCollector.ToExposition(), "text/plain"));
    }
}
