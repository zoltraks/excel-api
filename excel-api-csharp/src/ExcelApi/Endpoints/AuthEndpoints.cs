using System.Text.Json;
using BigBytes.ExcelApi.Auth;

namespace BigBytes.ExcelApi.Endpoints;

public static class AuthEndpoints
{
    public static void MapAuthEndpoints(this IEndpointRouteBuilder app, AuthService authService)
    {
        app.MapPost("/auth/token", async (HttpContext context) =>
        {
            string? grantType = null;
            string? clientId = null;
            string? clientSecret = null;
            string? username = null;
            string? password = null;

            if (context.Request.HasFormContentType)
            {
                var form = await context.Request.ReadFormAsync();
                grantType = form["grant_type"].FirstOrDefault();
                clientId = form["client_id"].FirstOrDefault();
                clientSecret = form["client_secret"].FirstOrDefault();
                username = form["username"].FirstOrDefault();
                password = form["password"].FirstOrDefault();
            }
            else if (context.Request.ContentType?.Contains("application/json") == true)
            {
                var json = await JsonSerializer.DeserializeAsync<Dictionary<string, JsonElement>>(context.Request.Body);
                if (json != null)
                {
                    grantType = json.TryGetValue("grant_type", out var gt) ? gt.GetString() : null;
                    clientId = json.TryGetValue("client_id", out var ci) ? ci.GetString() : null;
                    clientSecret = json.TryGetValue("client_secret", out var cs) ? cs.GetString() : null;
                    username = json.TryGetValue("username", out var u) ? u.GetString() : null;
                    password = json.TryGetValue("password", out var p) ? p.GetString() : null;
                }
            }

            List<string>? scopes = null;

            if (grantType == "client_credentials")
            {
                if (string.IsNullOrEmpty(clientId) || string.IsNullOrEmpty(clientSecret))
                {
                    return Results.BadRequest(new
                    {
                        error = "invalid_request",
                        error_description = "client_id and client_secret are required"
                    });
                }
                scopes = authService.ValidateClientCredentials(clientId, clientSecret);
            }
            else if (grantType == "password")
            {
                if (string.IsNullOrEmpty(username) || string.IsNullOrEmpty(password))
                {
                    return Results.BadRequest(new
                    {
                        error = "invalid_request",
                        error_description = "username and password are required"
                    });
                }
                scopes = authService.ValidatePasswordGrant(username, password);
            }
            else
            {
                return Results.BadRequest(new
                {
                    error = "unsupported_grant_type",
                    error_description = "Only client_credentials and password grants are supported"
                });
            }

            if (scopes == null)
            {
                return Results.Json(new
                {
                    error = "invalid_client",
                    error_description = "Invalid credentials"
                }, statusCode: StatusCodes.Status401Unauthorized);
            }

            var token = authService.Jwt.GenerateToken(
                grantType == "password" ? username! : clientId!,
                scopes);

            return Results.Ok(new
            {
                access_token = token,
                token_type = "Bearer",
                expires_in = authService.Jwt.ExpiresIn,
                scope = string.Join(" ", scopes)
            });
        });
    }
}
