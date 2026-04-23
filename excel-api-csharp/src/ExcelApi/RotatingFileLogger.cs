using System;
using System.IO;
using System.Linq;

namespace BigBytes.ExcelApi;

public class RotatingFileLogger
{
    private string logPath;
    private int maxFiles;
    private string currentLogFile;
    private string currentDate;

    public RotatingFileLogger(string logPath, int maxFiles = 7)
    {
        this.logPath = logPath;
        this.maxFiles = maxFiles;
        var logDir = Path.GetDirectoryName(logPath);

        // Ensure log directory exists
        if (!string.IsNullOrEmpty(logDir) && !Directory.Exists(logDir))
        {
            Directory.CreateDirectory(logDir);
        }

        currentDate = GetDateString();
        currentLogFile = GetLogFileName();
    }

    private string GetDateString()
    {
        return DateTime.Now.ToString("yyyy-MM-dd");
    }

    private string GetLogFileName()
    {
        var date = GetDateString();
        var dir = Path.GetDirectoryName(logPath);
        var ext = Path.GetExtension(logPath);
        var baseName = Path.GetFileNameWithoutExtension(logPath);
        return Path.Combine(dir ?? "", $"{baseName}-{date}{ext}");
    }

    private void RotateIfNeeded()
    {
        var today = GetDateString();
        if (today != currentDate)
        {
            CleanOldLogs();
            currentDate = today;
            currentLogFile = GetLogFileName();
        }
    }

    private void CleanOldLogs()
    {
        var logDir = Path.GetDirectoryName(logPath);
        if (string.IsNullOrEmpty(logDir) || !Directory.Exists(logDir))
        {
            return;
        }

        var baseName = Path.GetFileNameWithoutExtension(logPath);
        var files = Directory.GetFiles(logDir)
            .Where(f => Path.GetFileName(f).StartsWith(baseName))
            .OrderByDescending(f => f)
            .ToList();

        for (int i = maxFiles; i < files.Count; i++)
        {
            try
            {
                File.Delete(files[i]);
            }
            catch
            {
                // Ignore errors when cleaning up
            }
        }
    }

    public void Log(object data)
    {
        RotateIfNeeded();
        var logLine = System.Text.Json.JsonSerializer.Serialize(data) + "\n";
        File.AppendAllText(currentLogFile, logLine);
    }
}
