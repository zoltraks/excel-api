using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;

namespace BigBytes.ExcelApi.Endpoints;

public static class AuthEndpoints
{
    public static void MapAuthEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapPost("/auth/token", async (HttpRequest request) =>
        {
            string? grantType = null;
            string? clientId = null;
            string? clientSecret = null;
            string? username = null;
            string? password = null;

            string? contentType = request.ContentType?.Split(';')[0];

            if (contentType == "application/x-www-form-urlencoded")
            {
                var formData = await request.ReadFormAsync();
                grantType = formData["grant_type"];
                clientId = formData["client_id"];
                clientSecret = formData["client_secret"];
                username = formData["username"];
                password = formData["password"];
            }
            else
            {
                var jsonRequest = await request.ReadFromJsonAsync<Dictionary<string, string>>();
                if (jsonRequest != null)
                {
                    grantType = jsonRequest.GetValueOrDefault("grant_type");
                    clientId = jsonRequest.GetValueOrDefault("client_id");
                    clientSecret = jsonRequest.GetValueOrDefault("client_secret");
                    username = jsonRequest.GetValueOrDefault("username");
                    password = jsonRequest.GetValueOrDefault("password");
                }
            }

            if (grantType == "client_credentials")
            {
                if (clientId == "test-client" && clientSecret == "test-secret")
                {
                    return Results.Ok(new
                    {
                        access_token = "dummy-token",
                        token_type = "Bearer",
                        expires_in = 3600,
                        scope = "read write admin"
                    });
                }

                return Results.StatusCode(401);
            }
            else if (grantType == "password")
            {
                return Results.Ok(new
                {
                    access_token = "dummy-token",
                    token_type = "Bearer",
                    expires_in = 3600,
                    scope = "read write"
                });
            }

            return Results.BadRequest(new
            {
                error = "unsupported_grant_type",
                error_description = "Only client_credentials and password grants are supported"
            });
        });
    }
}
