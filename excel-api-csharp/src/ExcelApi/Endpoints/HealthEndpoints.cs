using Microsoft.AspNetCore.Routing;

namespace BigBytes.ExcelApi.Endpoints;

public static class HealthEndpoints
{
    public static void MapHealthEndpoints(this IEndpointRouteBuilder app, DateTime startTime)
    {
        app.MapGet("/health", () =>
        {
            var now = DateTime.UtcNow;
            var uptimeSeconds = (long)(now - startTime).TotalSeconds;
            var serverTime = now.ToString("o");
            var timezone = TimeZoneInfo.Local.Id;

            return Results.Ok(new
            {
                status = "ok",
                implementation = "excel-api-csharp",
                version = "0.0.1",
                uptime_seconds = uptimeSeconds,
                server_time = serverTime,
                timezone = timezone
            });
        });

        app.MapGet("/metrics", () =>
        {
            var now = DateTimeOffset.UtcNow.ToUnixTimeSeconds();
            var uptimeSeconds = (long)(DateTime.UtcNow - startTime).TotalSeconds;

            return Results.Text($$$"""
                # HELP excel_api_uptime_seconds Uptime of the Excel API server in seconds
                # TYPE excel_api_uptime_seconds gauge
                excel_api_uptime_seconds {uptimeSeconds} {now}

                # HELP excel_api_implementation_info Implementation information
                # TYPE excel_api_implementation_info gauge
                excel_api_implementation_info{{implementation="excel-api-csharp"}} 1 {now}
                """, "text/plain");
        });
    }
}
