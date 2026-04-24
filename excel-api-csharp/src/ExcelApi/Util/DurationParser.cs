using System;
using System.Text.RegularExpressions;

namespace BigBytes.ExcelApi.Util;

public static class DurationParser
{
    private static readonly Regex DurationPattern = new Regex(@"^(\d+)([smh])$", RegexOptions.Compiled);

    public static TimeSpan Parse(string duration)
    {
        var match = DurationPattern.Match(duration);
        if (!match.Success)
        {
            throw new ArgumentException($"Invalid duration format: {duration}. Expected format: <number><unit> where unit is s, m, or h.");
        }

        long value = long.Parse(match.Groups[1].Value);
        string unit = match.Groups[2].Value;

        return unit switch
        {
            "s" => TimeSpan.FromSeconds(value),
            "m" => TimeSpan.FromMinutes(value),
            "h" => TimeSpan.FromHours(value),
            _ => throw new ArgumentException($"Invalid duration unit: {unit}. Expected s, m, or h.")
        };
    }
}
