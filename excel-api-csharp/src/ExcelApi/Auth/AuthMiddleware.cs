namespace BigBytes.ExcelApi.Auth;

public class AuthMiddleware
{
    private static readonly HashSet<string> PublicPaths = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
    {
        "/auth/token",
        "/health",
        "/metrics",
        "/openapi.yaml",
        "/openapi.json",
    };

    private readonly RequestDelegate next;
    private readonly AuthService auth;
    private readonly string basePath;

    public AuthMiddleware(RequestDelegate next, AuthService auth, string basePath)
    {
        this.next = next;
        this.auth = auth;
        this.basePath = basePath;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        var path = context.Request.Path.Value ?? string.Empty;

        var relativePath = path;
        if (!string.IsNullOrEmpty(basePath))
        {
            var underBasePath = path.Equals(basePath, StringComparison.Ordinal)
                || path.StartsWith(basePath + "/", StringComparison.Ordinal);
            if (!underBasePath)
            {
                await next(context);
                return;
            }
            relativePath = path[basePath.Length..];
            if (string.IsNullOrEmpty(relativePath))
            {
                relativePath = "/";
            }
        }

        if (PublicPaths.Contains(relativePath))
        {
            await next(context);
            return;
        }

        var header = context.Request.Headers.Authorization.ToString();
        List<string>? scopes = null;

        if (header.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
        {
            scopes = auth.Jwt.ValidateToken(header["Bearer ".Length..].Trim());
        }
        else if (header.StartsWith("Token ", StringComparison.OrdinalIgnoreCase))
        {
            scopes = auth.ValidateStaticToken(header["Token ".Length..].Trim());
        }

        if (scopes == null)
        {
            context.Response.StatusCode = StatusCodes.Status401Unauthorized;
            await context.Response.WriteAsJsonAsync(new
            {
                error = "UNAUTHORIZED",
                message = "Authentication required"
            });
            return;
        }

        var isAdminEndpoint = relativePath.EndsWith("/lock-status", StringComparison.Ordinal);
        var requiredScope = isAdminEndpoint
            ? "admin"
            : HttpMethods.IsGet(context.Request.Method) ? "read" : "write";

        if (!auth.CheckPermission(scopes, requiredScope, context.Request.Method, isAdminEndpoint))
        {
            context.Response.StatusCode = StatusCodes.Status403Forbidden;
            await context.Response.WriteAsJsonAsync(new
            {
                error = "FORBIDDEN",
                message = "Insufficient permissions"
            });
            return;
        }

        await next(context);
    }
}
