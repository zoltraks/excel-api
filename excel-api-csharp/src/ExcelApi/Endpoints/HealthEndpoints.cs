using BigBytes.ExcelApi.Metrics;
using BigBytes.ExcelApi.Services;
using Microsoft.AspNetCore.Routing;

namespace BigBytes.ExcelApi.Endpoints;

public static class HealthEndpoints
{
    public static void MapHealthEndpoints(this IEndpointRouteBuilder app, DateTime startTime, MetricsCollector metricsCollector, ContractInfo contractInfo)
    {
        app.MapGet("/health", () =>
        {
            var now = DateTime.UtcNow;
            var uptimeSeconds = (long)(now - startTime).TotalSeconds;
            var time = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss.fff");
            var timezone = ResolveTimezone();

            return Results.Ok(new
            {
                status = "ok",
                implementation = "excel-api-csharp",
                version = contractInfo.Version,
                uptime = uptimeSeconds,
                time = time,
                zone = timezone
            });
        });

        app.MapGet("/metrics", () => Results.Text(metricsCollector.ToExposition(), "text/plain"));
    }

    // Shared precedence with the other implementations: TZ env, then the
    // /etc/localtime symlink target on Unix, then the platform default.
    private static string ResolveTimezone()
    {
        var tz = Environment.GetEnvironmentVariable("TZ");
        if (!string.IsNullOrEmpty(tz))
        {
            return tz;
        }

        try
        {
            var link = new FileInfo("/etc/localtime");
            if (link.LinkTarget != null)
            {
                var target = link.LinkTarget;
                var marker = "/zoneinfo/";
                var idx = target.IndexOf(marker, StringComparison.Ordinal);
                if (idx >= 0)
                {
                    return target[(idx + marker.Length)..];
                }
            }
        }
        catch (Exception)
        {
            // REASON: /etc/localtime may be absent or unreadable - fall through to platform default.
        }

        var localTz = TimeZoneInfo.Local;
        if (localTz.HasIanaId)
        {
            return localTz.Id;
        }
        return TimeZoneInfo.TryConvertWindowsIdToIanaId(localTz.Id, out string? ianaId)
            ? ianaId
            : localTz.Id;
    }
}
