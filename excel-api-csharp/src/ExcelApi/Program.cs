// Excel API C#  HTTP service entry point

using System;
using System.IO;
using System.Threading;
using BigBytes.ExcelApi.Config;
using BigBytes.ExcelApi.Endpoints;
using BigBytes.ExcelApi.Excel;
using BigBytes.ExcelApi.Logging;
using BigBytes.ExcelApi.Services;
using BigBytes.ExcelApi.Util;
using Microsoft.Extensions.Logging.Console;

// Parse command-line arguments
var configArgs = ParseConfigArgs(args);

var builder = WebApplication.CreateBuilder(args);

// Configure logging to use JSON format
builder.Logging.ClearProviders();
builder.Logging.AddConsole(options =>
{
    options.FormatterName = "customJson";
});
builder.Services.AddSingleton<ConsoleFormatter, JsonConsoleFormatter>();

// Add CORS services
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.AllowAnyOrigin();
        policy.AllowAnyMethod();
        policy.AllowAnyHeader();
    });
});

var app = builder.Build();

// Initialize file logger
var fileLogEnabled = Environment.GetEnvironmentVariable("LOGGING_FILE_ENABLED") == "true";
var fileLogPath = Environment.GetEnvironmentVariable("LOGGING_FILE_PATH") ?? "/var/log/excel-api/excel-api-csharp.log";
var fileLogMaxFiles = int.TryParse(Environment.GetEnvironmentVariable("LOGGING_FILE_MAX_FILES"), out var maxFiles) ? maxFiles : 7;

RotatingFileLogger? fileLogger = null;
if (fileLogEnabled)
{
    fileLogger = new RotatingFileLogger(fileLogPath, fileLogMaxFiles);
}

// Add CORS
app.UseCors(options =>
{
    options.AllowAnyOrigin();
    options.AllowAnyMethod();
    options.AllowAnyHeader();
});

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
var workDir = configArgs.WorkDir ?? Environment.GetEnvironmentVariable("WORK");
var configPath = configArgs.ConfigPath ?? Environment.GetEnvironmentVariable("CONFIG");

if (configArgs.Life != null)
{
    Environment.SetEnvironmentVariable("EXCEL_API_LIFE", configArgs.Life);
}

var workbookConfig = ConfigLoader.LoadConfig<WorkbookConfig>(workDir, configPath, false);

// Register endpoint groups
app.MapHealthEndpoints(startTime);
app.MapOpenApiEndpoints();
app.MapAuthEndpoints();
app.MapWorkbookEndpoints(workbookConfig, excelService);
app.MapSheetEndpoints(workbookConfig, excelService);
app.MapCellEndpoints(workbookConfig, excelService);
app.MapRecordEndpoints(workbookConfig, excelService);

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

app.Run("http://0.0.0.0:8443");

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
