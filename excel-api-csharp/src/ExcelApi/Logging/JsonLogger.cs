namespace BigBytes.ExcelApi.Logging;

using System.Text.Json;

public class JsonLogger
{
    public static string FormatLog(string level, string message, Dictionary<string, object>? additional = null)
    {
        var now = DateTime.Now;
        var logEntry = new Dictionary<string, object>
        {
            { "level", level },
            { "date", now.ToString("yyyy-MM-dd") },
            { "time", now.ToString("HH:mm:ss.fff") },
            { "message", message }
        };

        if (additional != null)
        {
            foreach (var kvp in additional)
            {
                logEntry[kvp.Key] = kvp.Value;
            }
        }

        return JsonSerializer.Serialize(logEntry);
    }
}
