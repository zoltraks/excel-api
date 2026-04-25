using Microsoft.AspNetCore.Routing;

namespace BigBytes.ExcelApi.Endpoints;

public static class OpenApiEndpoints
{
    public static void MapOpenApiEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapGet("/openapi.yaml", () =>
        {
            var assembly = System.Reflection.Assembly.GetExecutingAssembly();
            var resourceName = "BigBytes.ExcelApi.Resources.openapi.yaml";
            var stream = assembly.GetManifestResourceStream(resourceName);

            if (stream == null)
            {
                resourceName = "ExcelApi.Resources.openapi.yaml";
                stream = assembly.GetManifestResourceStream(resourceName);
            }

            if (stream == null)
            {
                return Results.NotFound("OpenAPI specification not found");
            }

            using var reader = new StreamReader(stream);
            var content = reader.ReadToEnd();

            content = content.Replace("${server.host}", "0.0.0.0");
            content = content.Replace("${server.port}", "8443");
            content = content.Replace("${server.basePath}", "/api/v1");
            content = content.Replace("${implementation}", "excel-api-csharp");
            content = content.Replace("${version}", "0.0.1");

            return Results.Text(content, "application/yaml");
        });
    }
}
