namespace BigBytes.ExcelApi.Config;

public class LoggingConfig
{
    public string Level { get; set; } = "info";
    public string Format { get; set; } = "json";
    public LoggingFileConfig? File { get; set; }
}

public class LoggingFileConfig
{
    public bool Enabled { get; set; }
    public string Path { get; set; } = "";
    public int MaxFiles { get; set; } = 7;
}
