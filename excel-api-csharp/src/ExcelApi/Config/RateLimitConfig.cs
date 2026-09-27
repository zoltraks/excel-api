namespace BigBytes.ExcelApi.Config;

public class RateLimitConfig
{
    public bool Enabled { get; set; } = true;
    public int TokenPerMinute { get; set; } = 20;
    public int RequestsPerMinute { get; set; } = 600;
}
