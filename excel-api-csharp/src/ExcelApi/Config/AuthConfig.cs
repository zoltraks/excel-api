namespace BigBytes.ExcelApi.Config;

public class AuthConfig
{
    public string Mode { get; set; } = "jwt";
    public JwtIssuerConfig Jwt { get; set; } = new JwtIssuerConfig();
}

public class JwtIssuerConfig
{
    public string Issuer { get; set; } = "excel-api";
    public int ExpirationMinutes { get; set; } = 60;
    public string Algorithm { get; set; } = "HS256";
}
