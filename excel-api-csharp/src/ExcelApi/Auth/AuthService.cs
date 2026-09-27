using System.Security.Cryptography;
using System.Text;
using BigBytes.ExcelApi.Config;

namespace BigBytes.ExcelApi.Auth;

public class AuthService
{
    private readonly AccessConfig access;

    public AuthService(AccessConfig access, JwtService jwt)
    {
        this.access = access;
        Jwt = jwt;
    }

    public JwtService Jwt { get; }

    public List<string>? ValidateClientCredentials(string clientId, string clientSecret)
    {
        var client = access.Oauth2.Clients.FirstOrDefault(c =>
            c.ClientId == clientId && c.GrantTypes.Contains("client_credentials"));
        if (client == null || !SecretEquals(client.ClientSecret, clientSecret))
        {
            return null;
        }
        return client.Scopes;
    }

    public List<string>? ValidatePasswordGrant(string username, string password)
    {
        var user = access.Oauth2.Users.FirstOrDefault(u => u.Username == username);
        if (user == null)
        {
            return null;
        }
        try
        {
            if (!BCrypt.Net.BCrypt.Verify(password, user.PasswordHash))
            {
                return null;
            }
        }
        catch (Exception)
        {
            return null;
        }
        return user.Scopes;
    }

    public List<string>? ValidateStaticToken(string token)
    {
        var entry = access.Tokens.Static.FirstOrDefault(t => SecretEquals(t.Token, token));
        return entry?.Scopes;
    }

    public bool CheckPermission(IEnumerable<string> tokenScopes, string requiredScope, string method, bool isAdminEndpoint)
    {
        if (!tokenScopes.Contains(requiredScope))
        {
            return false;
        }
        var rule = access.Acl.Rules.FirstOrDefault(r => r.Scope == requiredScope);
        if (rule == null)
        {
            return true;
        }
        if (!rule.Allow.Any(a => string.Equals(a, method, StringComparison.OrdinalIgnoreCase)))
        {
            return false;
        }
        return !isAdminEndpoint || rule.AdminEndpoints;
    }

    private static bool SecretEquals(string expected, string actual)
    {
        return CryptographicOperations.FixedTimeEquals(
            Encoding.UTF8.GetBytes(expected),
            Encoding.UTF8.GetBytes(actual));
    }
}
