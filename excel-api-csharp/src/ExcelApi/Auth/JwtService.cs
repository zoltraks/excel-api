using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using System.Text.Json;
using Microsoft.IdentityModel.Tokens;

namespace BigBytes.ExcelApi.Auth;

public class JwtService
{
    private readonly SymmetricSecurityKey key;
    private readonly string issuer;
    private readonly int expirationMinutes;
    private readonly JwtSecurityTokenHandler handler = new JwtSecurityTokenHandler();

    public JwtService(string secret, string issuer, int expirationMinutes)
    {
        key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret));
        this.issuer = issuer;
        this.expirationMinutes = expirationMinutes;
    }

    public int ExpiresIn => expirationMinutes * 60;

    public string GenerateToken(string subject, IReadOnlyList<string> scopes)
    {
        var now = DateTime.UtcNow;
        var claims = new List<Claim>
        {
            new Claim(JwtRegisteredClaimNames.Sub, subject),
            new Claim(JwtRegisteredClaimNames.Iss, issuer),
            new Claim("scope", JsonSerializer.Serialize(scopes), JsonClaimValueTypes.JsonArray),
        };

        var token = new JwtSecurityToken(
            claims: claims,
            notBefore: now,
            expires: now.AddMinutes(expirationMinutes),
            signingCredentials: new SigningCredentials(key, SecurityAlgorithms.HmacSha256));

        return handler.WriteToken(token);
    }

    public List<string>? ValidateToken(string token)
    {
        try
        {
            var parameters = new TokenValidationParameters
            {
                ValidateIssuer = true,
                ValidIssuer = issuer,
                ValidateAudience = false,
                ValidateLifetime = true,
                ValidateIssuerSigningKey = true,
                IssuerSigningKey = key,
                ClockSkew = TimeSpan.FromSeconds(30),
            };
            handler.ValidateToken(token, parameters, out _);
            return ExtractScopes(handler.ReadJwtToken(token));
        }
        catch (Exception)
        {
            return null;
        }
    }

    private static List<string> ExtractScopes(JwtSecurityToken jwt)
    {
        var scopes = new List<string>();
        foreach (var claim in jwt.Claims.Where(c => c.Type == "scope"))
        {
            if (claim.Value.TrimStart().StartsWith('['))
            {
                var parsed = JsonSerializer.Deserialize<List<string>>(claim.Value);
                if (parsed != null)
                {
                    scopes.AddRange(parsed);
                }
            }
            else
            {
                scopes.Add(claim.Value);
            }
        }
        return scopes;
    }
}
