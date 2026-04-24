namespace BigBytes.ExcelApi.Logging;

using System.Text;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Logging.Console;

public class JsonConsoleFormatter : ConsoleFormatter
{
    public JsonConsoleFormatter() : base("customJson")
    {
    }

    public override void Write<TState>(in LogEntry<TState> logEntry, IExternalScopeProvider? scopeProvider, TextWriter textWriter)
    {
        var now = DateTime.Now;
        var level = logEntry.LogLevel.ToString().ToLower();
        var date = now.ToString("yyyy-MM-dd");
        var time = now.ToString("HH:mm:ss.fff");
        var message = logEntry.Formatter?.Invoke(logEntry.State, logEntry.Exception) ?? "";

        var sb = new StringBuilder();
        sb.Append('{');
        sb.Append($"\"level\":\"{level}\",");
        sb.Append($"\"date\":\"{date}\",");
        sb.Append($"\"time\":\"{time}\",");
        sb.Append($"\"message\":{System.Text.Json.JsonSerializer.Serialize(message)}");
        sb.Append('}');
        sb.AppendLine();

        textWriter.Write(sb.ToString());
    }
}
