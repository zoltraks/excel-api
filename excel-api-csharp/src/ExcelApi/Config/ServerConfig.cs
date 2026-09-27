namespace BigBytes.ExcelApi.Config;

public class ServerConfig
{
    public int Port { get; set; } = 8443;
    public string Host { get; set; } = "0.0.0.0";
    public string BasePath { get; set; } = "";
    public ServerTlsConfig? Tls { get; set; }
    public ServerCorsConfig? Cors { get; set; }
}

public class ServerCorsConfig
{
    public bool Enabled { get; set; } = true;
    public List<string> AllowedOrigins { get; set; } = new();
}

public class ServerTlsConfig
{
    public bool Enabled { get; set; }
    public string? CertFile { get; set; }
    public string? KeyFile { get; set; }
}
