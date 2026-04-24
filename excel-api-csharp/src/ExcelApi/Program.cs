// Excel API C# — HTTP service entry point

using System;
using System.Collections.Generic;
using System.Linq;
using System.IO;
using BigBytes.ExcelApi;
using BigBytes.ExcelApi.Config;

// Parse command-line arguments
var configArgs = ParseConfigArgs(args);

var builder = WebApplication.CreateBuilder(args);

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

// Initialize file logger (can be configured via environment variables)
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

        var logData = new
        {
            level = "info",
            time = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds(),
            req = new
            {
                method = context.Request.Method,
                url = context.Request.Path.ToString(),
                host = context.Request.Host.ToString(),
                remoteAddress = context.Connection.RemoteIpAddress?.ToString()
            },
            res = new
            {
                statusCode = context.Response.StatusCode
            }
        };

        fileLogger.Log(logData);
    });
}

var startTime = DateTime.UtcNow;
var excelService = new ExcelService();

// Load configuration using new resolution logic
var workDir = configArgs.WorkDir ?? Environment.GetEnvironmentVariable("WORK");
var configPath = configArgs.ConfigPath ?? Environment.GetEnvironmentVariable("CONFIG");
var accessPath = configArgs.AccessPath ?? Environment.GetEnvironmentVariable("ACCESS");

var workbookConfig = ConfigLoader.LoadConfig<WorkbookConfig>(workDir, configPath, false);

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

app.MapGet("/workbooks", () =>
{
    var workbooks = workbookConfig.Registry
        .Where(e => File.Exists(e.Path))
        .Select(e => new
        {
            id = e.Id,
            filename = e.Path,
            @readonly = e.Readonly,
            modified_at = File.GetLastWriteTime(e.Path).ToString("o"),
            size_bytes = new FileInfo(e.Path).Length
        })
        .ToList();

    return Results.Ok(new
    {
        items = workbooks,
        total = workbooks.Count()
    });
});

app.MapGet("/workbooks/{id}", (string id) =>
{
    var entry = workbookConfig.Registry.FirstOrDefault(w => w.Id == id);
    if (entry == null || !File.Exists(entry.Path))
    {
        return Results.NotFound(new { error = "WORKBOOK_NOT_FOUND", message = $"Workbook with ID '{id}' not found" });
    }

    var fileInfo = new FileInfo(entry.Path);
    var sheets = excelService.ReadSheetNames(entry.Path);

    return Results.Ok(new
    {
        id = entry.Id,
        filename = entry.Path,
        @readonly = entry.Readonly,
        modified_at = fileInfo.LastWriteTime.ToString("o"),
        size_bytes = fileInfo.Length,
        sheets = sheets
    });
});

app.MapGet("/workbooks/{id}/sheets/{sheetName}", (string id, string sheetName) =>
{
    var entry = workbookConfig.Registry.FirstOrDefault(w => w.Id == id);
    if (entry == null)
    {
        return Results.NotFound(new { error = "WORKBOOK_NOT_FOUND", message = $"Workbook with ID '{id}' not found" });
    }

    var metadata = excelService.GetSheetMetadata(entry.Path, sheetName);

    return Results.Ok(metadata);
});

app.MapGet("/openapi.yaml", () =>
{
    var assembly = System.Reflection.Assembly.GetExecutingAssembly();
    var resourceName = "ExcelApi.Resources.openapi.yaml";

    using var stream = assembly.GetManifestResourceStream(resourceName);
    if (stream == null)
    {
        return Results.NotFound("OpenAPI specification not found");
    }

    using var reader = new StreamReader(stream);
    var content = reader.ReadToEnd();

    // Replace dynamic fields
    content = content.Replace("${server.host}", "0.0.0.0");
    content = content.Replace("${server.port}", "8443");
    content = content.Replace("${server.basePath}", "/api/v1");
    content = content.Replace("${implementation}", "excel-api-csharp");
    content = content.Replace("${version}", "0.0.1");

    return Results.Text(content, "application/yaml");
});

app.MapGet("/openapi.json", () =>
{
    var assembly = System.Reflection.Assembly.GetExecutingAssembly();
    var resourceName = "ExcelApi.Resources.openapi.yaml";

    using var stream = assembly.GetManifestResourceStream(resourceName);
    if (stream == null)
    {
        return Results.NotFound("OpenAPI specification not found");
    }

    using var reader = new StreamReader(stream);
    var content = reader.ReadToEnd();

    // Replace dynamic fields
    content = content.Replace("${server.host}", "0.0.0.0");
    content = content.Replace("${server.port}", "8443");
    content = content.Replace("${server.basePath}", "/api/v1");
    content = content.Replace("${implementation}", "excel-api-csharp");
    content = content.Replace("${version}", "0.0.1");

    // TODO: Convert YAML to JSON using YamlDotNet
    // For now, return YAML as JSON (not ideal but functional)
    return Results.Text(content, "application/json");
});

app.MapPost("/auth/token", (dynamic request) =>
{
    string grantType = request.grant_type;

    // TODO: Implement OAuth2 token generation
    if (grantType == "client_credentials" || grantType == "password")
    {
        return Results.Ok(new
        {
            access_token = "dummy-token",
            token_type = "Bearer",
            expires_in = 3600,
            scope = "read write"
        });
    }

    return Results.BadRequest(new
    {
        error = "unsupported_grant_type",
        error_description = "Only client_credentials and password grants are supported"
    });
});

app.MapGet("/workbooks/{id}/sheets/{sheetName}/cells/{cellRef}", (string id, string sheetName, string cellRef, string format = "native") =>
{
    var entry = workbookConfig.Registry.FirstOrDefault(w => w.Id == id);
    if (entry == null)
    {
        return Results.NotFound(new { error = "WORKBOOK_NOT_FOUND", message = $"Workbook with ID '{id}' not found" });
    }

    var cellData = excelService.ReadCell(entry.Path, sheetName, cellRef, format);

    return Results.Ok(new
    {
        value = cellData.Value,
        type = cellData.Type,
        number_format = cellData.NumberFormat,
        is_formula = cellData.IsFormula,
        formatted = cellData.Formatted
    });
});

app.MapGet("/workbooks/{id}/sheets/{sheetName}/ranges/{rangeRef}", (string id, string sheetName, string rangeRef, string format = "native") =>
{
    var entry = workbookConfig.Registry.FirstOrDefault(w => w.Id == id);
    if (entry == null)
    {
        return Results.NotFound(new { error = "WORKBOOK_NOT_FOUND", message = $"Workbook with ID '{id}' not found" });
    }

    var rangeData = excelService.ReadRange(entry.Path, sheetName, rangeRef, format);

    return Results.Ok(rangeData);
});

app.MapGet("/workbooks/{id}/sheets/{sheetName}/records", (string id, string sheetName, int offset = 0, int limit = 100, string format = "native") =>
{
    var entry = workbookConfig.Registry.FirstOrDefault(w => w.Id == id);
    if (entry == null)
    {
        return Results.NotFound(new { error = "WORKBOOK_NOT_FOUND", message = $"Workbook with ID '{id}' not found" });
    }

    var records = excelService.ReadRecords(entry.Path, sheetName, 1, offset, limit, format);

    return Results.Ok(records);
});

app.MapGet("/workbooks/{id}/sheets/{sheetName}/records/{recordIndex}", (string id, string sheetName, int recordIndex, string format = "native") =>
{
    var entry = workbookConfig.Registry.FirstOrDefault(w => w.Id == id);
    if (entry == null)
    {
        return Results.NotFound(new { error = "WORKBOOK_NOT_FOUND", message = $"Workbook with ID '{id}' not found" });
    }

    var record = excelService.ReadRecord(entry.Path, sheetName, recordIndex, 1, format);

    return Results.Ok(record);
});

app.MapPut("/workbooks/{id}/sheets/{sheetName}/cells/{cellRef}", (string id, string sheetName, string cellRef, dynamic request) =>
{
    var entry = workbookConfig.Registry.FirstOrDefault(w => w.Id == id);
    if (entry == null)
    {
        return Results.NotFound(new { error = "WORKBOOK_NOT_FOUND", message = $"Workbook with ID '{id}' not found" });
    }

    if (entry.Readonly)
    {
        return Results.StatusCode(422);
    }

    var value = request.value;
    var cellData = excelService.WriteCell(entry.Path, sheetName, cellRef, value);

    return Results.Ok(new
    {
        value = cellData.Value,
        type = cellData.Type,
        number_format = cellData.NumberFormat,
        is_formula = cellData.IsFormula,
        formatted = cellData.Formatted
    });
});

app.MapPost("/workbooks/{id}/sheets/{sheetName}/records", (string id, string sheetName, dynamic request) =>
{
    var entry = workbookConfig.Registry.FirstOrDefault(w => w.Id == id);
    if (entry == null)
    {
        return Results.NotFound(new { error = "WORKBOOK_NOT_FOUND", message = $"Workbook with ID '{id}' not found" });
    }

    if (entry.Readonly)
    {
        return Results.StatusCode(422);
    }

    var data = (Dictionary<string, object>)request.data;
    int? afterRow = request.after_row != null ? (int)request.after_row : null;
    int? copyStyleFrom = request.copy_style_from != null ? (int)request.copy_style_from : null;

    var record = excelService.AddRecord(entry.Path, sheetName, data, afterRow, copyStyleFrom);

    return Results.Ok(record);
});

app.MapPut("/workbooks/{id}/sheets/{sheetName}/records/{recordIndex}", (string id, string sheetName, int recordIndex, dynamic request) =>
{
    var entry = workbookConfig.Registry.FirstOrDefault(w => w.Id == id);
    if (entry == null)
    {
        return Results.NotFound(new { error = "WORKBOOK_NOT_FOUND", message = $"Workbook with ID '{id}' not found" });
    }

    if (entry.Readonly)
    {
        return Results.StatusCode(422);
    }

    var data = (Dictionary<string, object>)request.data;
    var record = excelService.UpdateRecord(entry.Path, sheetName, recordIndex, data);

    return Results.Ok(record);
});

app.MapDelete("/workbooks/{id}/sheets/{sheetName}/records/{recordIndex}", (string id, string sheetName, int recordIndex) =>
{
    var entry = workbookConfig.Registry.FirstOrDefault(w => w.Id == id);
    if (entry == null)
    {
        return Results.NotFound(new { error = "WORKBOOK_NOT_FOUND", message = $"Workbook with ID '{id}' not found" });
    }

    if (entry.Readonly)
    {
        return Results.StatusCode(422);
    }

    excelService.DeleteRecord(entry.Path, sheetName, recordIndex);

    return Results.NoContent();
});

app.MapGet("/workbooks/{id}/sheets/{sheetName}/columns", (string id, string sheetName) =>
{
    var entry = workbookConfig.Registry.FirstOrDefault(w => w.Id == id);
    if (entry == null)
    {
        return Results.NotFound(new { error = "WORKBOOK_NOT_FOUND", message = $"Workbook with ID '{id}' not found" });
    }

    var columns = excelService.GetColumnDefinitions(entry.Path, sheetName);

    return Results.Ok(columns);
});

app.MapGet("/workbooks/{id}/lock-status", (string id) =>
{
    var entry = workbookConfig.Registry.FirstOrDefault(w => w.Id == id);
    if (entry == null)
    {
        return Results.NotFound(new { error = "WORKBOOK_NOT_FOUND", message = $"Workbook with ID '{id}' not found" });
    }

    // TODO: Implement actual lock status checking
    return Results.Ok(new
    {
        locked = false,
        queue_depth = 0
    });
});

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
    }
    return result;
}

class ConfigArgs
{
    public string? WorkDir { get; set; }
    public string? ConfigPath { get; set; }
    public string? AccessPath { get; set; }
}
