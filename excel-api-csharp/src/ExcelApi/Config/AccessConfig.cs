namespace BigBytes.ExcelApi.Config;

public class AccessConfig
{
    public JwtAccessConfig Jwt { get; set; } = new JwtAccessConfig();
    public OAuth2Config Oauth2 { get; set; } = new OAuth2Config();
    public TokensConfig Tokens { get; set; } = new TokensConfig();
    public AclConfig Acl { get; set; } = new AclConfig();
}

public class JwtAccessConfig
{
    public string Secret { get; set; } = "";
}

public class OAuth2Config
{
    public List<OAuth2Client> Clients { get; set; } = new List<OAuth2Client>();
    public List<OAuth2User> Users { get; set; } = new List<OAuth2User>();
}

public class OAuth2Client
{
    public string ClientId { get; set; } = "";
    public string ClientSecret { get; set; } = "";
    public List<string> GrantTypes { get; set; } = new List<string>();
    public List<string> Scopes { get; set; } = new List<string>();
}

public class OAuth2User
{
    public string Username { get; set; } = "";
    public string PasswordHash { get; set; } = "";
    public List<string> Scopes { get; set; } = new List<string>();
}

public class TokensConfig
{
    public List<StaticToken> Static { get; set; } = new List<StaticToken>();
}

public class StaticToken
{
    public string Token { get; set; } = "";
    public string Name { get; set; } = "";
    public List<string> Scopes { get; set; } = new List<string>();
}

public class AclConfig
{
    public List<AclRule> Rules { get; set; } = new List<AclRule>();
}

public class AclRule
{
    public string Scope { get; set; } = "";
    public List<string> Allow { get; set; } = new List<string>();
    public bool AdminEndpoints { get; set; }
}
