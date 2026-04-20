// Excel API C# — HTTP service entry point

var builder = WebApplication.CreateBuilder(args);
var app = builder.Build();

app.MapGet("/health", () => Results.Ok(new
{
    status = "ok",
    implementation = "excel-api-csharp",
    version = "0.1.0",
    uptime_seconds = (int)TimeSpan.FromMilliseconds(Environment.TickCount64).TotalSeconds
}));

app.Run("http://0.0.0.0:8443");
