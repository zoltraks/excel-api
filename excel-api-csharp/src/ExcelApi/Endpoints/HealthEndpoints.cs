using BigBytes.ExcelApi.Metrics;
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
            var time = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss.fff");
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
                version = "0.0.6",
                uptime = uptimeSeconds,
                time = time,
                timezone = timezone
            });
        });

        app.MapGet("/metrics", () => Results.Text(metricsCollector.ToExposition(), "text/plain"));
    }
}
