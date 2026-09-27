namespace BigBytes.ExcelApi.Config;

public class QueueConfig
{
    public int BatchMaxSize { get; set; } = 50;
    public int BatchDebounceMs { get; set; } = 100;
    public int LockTimeoutMs { get; set; } = 10000;
    public string LockDir { get; set; } = "locks";
}
