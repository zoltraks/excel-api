// Excel API C#  HTTP service entry point

using System;
using System.IO;
using System.Threading;
using BigBytes.ExcelApi.Auth;
using BigBytes.ExcelApi.Config;
using BigBytes.ExcelApi.Endpoints;
using BigBytes.ExcelApi.Excel;
using BigBytes.ExcelApi.Logging;
using BigBytes.ExcelApi.Services;
using BigBytes.ExcelApi.Util;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.Extensions.Logging.Console;

// Parse command-line arguments
var configArgs = ParseConfigArgs(args);

var workDir = configArgs.WorkDir ?? Environment.GetEnvironmentVariable("WORK");
var configPath = configArgs.ConfigPath ?? Environment.GetEnvironmentVariable("CONFIG");
var accessPath = configArgs.AccessPath ?? Environment.GetEnvironmentVariable("ACCESS");
var serverConfig = ConfigLoader.LoadServerConfig(workDir, configPath);
var rateLimitConfig = ConfigLoader.LoadRateLimitConfig(workDir, configPath);

var builder = WebApplication.CreateBuilder(args);

// Configure Kestrel listener (TLS when server.tls.enabled)
var tlsConfig = serverConfig.Tls;
System.Security.Cryptography.X509Certificates.X509Certificate2? serverCertificate = null;
if (tlsConfig?.Enabled == true)
{
    if (string.IsNullOrEmpty(tlsConfig.CertFile) || string.IsNullOrEmpty(tlsConfig.KeyFile))
    {
        throw new InvalidOperationException(
            "TLS is enabled but server.tls.cert_file and/or server.tls.key_file are not configured");
    }
    serverCertificate = System.Security.Cryptography.X509Certificates.X509Certificate2.CreateFromPemFile(
        ResolveWorkPath(tlsConfig.CertFile, workDir),
        ResolveWorkPath(tlsConfig.KeyFile, workDir));
}

var listenAddress = string.IsNullOrEmpty(serverConfig.Host) || serverConfig.Host == "0.0.0.0"
    ? System.Net.IPAddress.Any
    : System.Net.IPAddress.Parse(serverConfig.Host);

builder.WebHost.ConfigureKestrel(kestrel =>
{
    kestrel.Listen(listenAddress, serverConfig.Port, listen =>
    {
        if (serverCertificate != null)
        {
            listen.UseHttps(serverCertificate);
        }
    });
});

// Configure logging to use JSON format
builder.Logging.ClearProviders();
builder.Logging.AddConsole(options =>
{
    options.FormatterName = "customJson";
});
builder.Services.AddSingleton<ConsoleFormatter, JsonConsoleFormatter>();

// Contract uses snake_case JSON field names
builder.Services.ConfigureHttpJsonOptions(options =>
{
    options.SerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.SnakeCaseLower;
});

// Add CORS services
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        var corsConfig = serverConfig.Cors;
        if (corsConfig is not { Enabled: true } || corsConfig.AllowedOrigins.Count == 0)
        {
            return;
        }
        if (corsConfig.AllowedOrigins.Contains("*"))
        {
            policy.AllowAnyOrigin();
        }
        else
        {
            policy.WithOrigins(corsConfig.AllowedOrigins.ToArray()).AllowCredentials();
        }
        policy.AllowAnyMethod();
        policy.AllowAnyHeader();
    });
});

// Add rate limiting: strict per-IP window on /auth/token, generous global window
if (rateLimitConfig.Enabled)
{
    builder.Services.AddRateLimiter(options =>
    {
        options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
        options.OnRejected = async (context, _) =>
        {
            context.HttpContext.Response.ContentType = "application/json";
            await context.HttpContext.Response.WriteAsJsonAsync(new
            {
                error = "RATE_LIMITED",
                message = "Rate limit exceeded"
            });
        };
        options.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(context =>
        {
            var key = context.Connection.RemoteIpAddress?.ToString() ?? "unknown";
            var isTokenRequest = HttpMethods.IsPost(context.Request.Method)
                && context.Request.Path.Value?.EndsWith("/auth/token") == true;
            var permitLimit = isTokenRequest ? rateLimitConfig.TokenPerMinute : rateLimitConfig.RequestsPerMinute;
            return RateLimitPartition.GetFixedWindowLimiter(
                key + (isTokenRequest ? ":token" : ":global"),
                _ => new FixedWindowRateLimiterOptions
                {
                    PermitLimit = permitLimit,
                    Window = TimeSpan.FromMinutes(1),
                    QueueLimit = 0,
                });
        });
    });
}

var app = builder.Build();

// Initialize file logger from logging.file config (env override for path only)
var loggingConfig = ConfigLoader.LoadLoggingConfig(workDir, configPath);
RotatingFileLogger? fileLogger = null;
if (loggingConfig.File?.Enabled == true && !string.IsNullOrEmpty(loggingConfig.File.Path))
{
    fileLogger = new RotatingFileLogger(loggingConfig.File.Path, loggingConfig.File.MaxFiles);
}

// Baseline security headers on every response
app.Use(async (context, next) =>
{
    context.Response.Headers["X-Content-Type-Options"] = "nosniff";
    context.Response.Headers["X-Frame-Options"] = "DENY";
    context.Response.Headers["Referrer-Policy"] = "no-referrer";
    await next();
});

// Add CORS
app.UseCors();

if (rateLimitConfig.Enabled)
{
    app.UseRateLimiter();
}

// Add file logging middleware
if (fileLogger != null)
{
    app.Use(async (context, next) =>
    {
        await next();

        var now = DateTime.Now;
        var logData = new
        {
            level = "info",
            date = now.ToString("yyyy-MM-dd"),
            time = now.ToString("HH:mm:ss.fff"),
            message = "Request completed",
            request = new { method = context.Request.Method, url = context.Request.Path.ToString() },
            response = new { statusCode = context.Response.StatusCode },
            remote = context.Connection.RemoteIpAddress?.ToString()
        };

        fileLogger.Log(logData);
    });
}

var startTime = DateTime.UtcNow;
var excelService = new ExcelService();

// Load configuration
if (configArgs.Life != null)
{
    Environment.SetEnvironmentVariable("LIFE", configArgs.Life);
}

var workbookConfig = ConfigLoader.LoadConfig<WorkbookConfig>(workDir, configPath, false);
var accessConfig = ConfigLoader.LoadConfig<AccessConfig>(workDir, accessPath, true);
var queueConfig = ConfigLoader.LoadQueueConfig(workDir, configPath);
var fileLockService = new FileLockService(queueConfig.LockDir, queueConfig.LockTimeoutMs);
var writeQueueService = new WriteQueueService(queueConfig.BatchMaxSize);
var metricsCollector = new MetricsCollector();
var authConfig = ConfigLoader.LoadAuthConfig(workDir, configPath);
var basePath = serverConfig.BasePath.TrimEnd('/');

var jwtService = new JwtService(accessConfig.Jwt.Secret, authConfig.Jwt.Issuer, authConfig.Jwt.ExpirationMinutes);
var authService = new AuthService(accessConfig, jwtService);
app.Use(async (context, next) =>
{
    var sw = System.Diagnostics.Stopwatch.StartNew();
    try
    {
        await next();
    }
    finally
    {
        sw.Stop();
        metricsCollector.RecordRequest(context.Request.Method, context.Response.StatusCode, sw.Elapsed.TotalMilliseconds);
    }
});

app.UseMiddleware<AuthMiddleware>(authService, basePath);

// Register endpoint groups
app.MapHealthEndpoints(startTime, metricsCollector);
app.MapOpenApiEndpoints();

var authGroup = string.IsNullOrEmpty(basePath) ? app.MapGroup("") : app.MapGroup(basePath);
authGroup.MapAuthEndpoints(authService);

var apiGroup = string.IsNullOrEmpty(basePath) ? app.MapGroup("") : app.MapGroup(basePath);
apiGroup.MapHealthEndpoints(startTime, metricsCollector);
apiGroup.MapOpenApiEndpoints();
apiGroup.MapWorkbookEndpoints(workbookConfig, excelService, fileLockService, writeQueueService);
apiGroup.MapSheetEndpoints(workbookConfig, excelService);
apiGroup.MapCellEndpoints(workbookConfig, excelService, fileLockService, writeQueueService);
apiGroup.MapRecordEndpoints(workbookConfig, excelService, fileLockService, writeQueueService);
apiGroup.MapOperationsEndpoints(workbookConfig, excelService, fileLockService, writeQueueService);

// Set up lifecycle limit if configured
if (workbookConfig.Lifecycle?.Life != null)
{
    try
    {
        var lifeSpan = DurationParser.Parse(workbookConfig.Lifecycle.Life);
        Console.WriteLine($"Lifecycle limit set to {workbookConfig.Lifecycle.Life}, will shut down gracefully after this duration");

        var cts = new CancellationTokenSource();
        _ = Task.Delay(lifeSpan, cts.Token).ContinueWith(_ =>
        {
            Console.WriteLine("Lifecycle limit reached, initiating graceful shutdown");
            Environment.Exit(0);
        });
    }
    catch (ArgumentException ex)
    {
        Console.Error.WriteLine($"Invalid lifecycle duration format: {workbookConfig.Lifecycle.Life}");
        Console.Error.WriteLine(ex.Message);
    }
}

app.Run();

string ResolveWorkPath(string path, string? baseDir)
{
    if (Path.IsPathRooted(path))
    {
        return path;
    }
    return Path.Combine(baseDir ?? Directory.GetCurrentDirectory(), path);
}

ConfigArgs ParseConfigArgs(string[] args)
{
    var result = new ConfigArgs();
    for (int i = 0; i < args.Length; i++)
    {
        if (args[i] == "--work" && i + 1 < args.Length)
        {
            result.WorkDir = args[i + 1];
            i++;
        }
        else if (args[i] == "--config" && i + 1 < args.Length)
        {
            result.ConfigPath = args[i + 1];
            i++;
        }
        else if (args[i] == "--access" && i + 1 < args.Length)
        {
            result.AccessPath = args[i + 1];
            i++;
        }
        else if (args[i] == "--life" && i + 1 < args.Length)
        {
            result.Life = args[i + 1];
            i++;
        }
    }
    return result;
}

class ConfigArgs
{
    public string? WorkDir { get; set; }
    public string? ConfigPath { get; set; }
    public string? AccessPath { get; set; }
    public string? Life { get; set; }
}
