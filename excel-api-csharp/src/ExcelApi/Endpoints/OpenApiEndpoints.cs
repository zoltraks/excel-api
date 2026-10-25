using BigBytes.ExcelApi.Services;
using Microsoft.AspNetCore.Routing;

namespace BigBytes.ExcelApi.Endpoints;

public static class OpenApiEndpoints
{
    public static void MapOpenApiEndpoints(this IEndpointRouteBuilder app, ContractInfo contractInfo)
    {
        app.MapGet("/openapi.yaml", () =>
        {
            var content = contractInfo.Content;
            if (content == null)
            {
                return Results.NotFound("OpenAPI specification not found");
            }

            return Results.Text(content, "application/yaml");
        });

        app.MapGet("/openapi.json", () =>
        {
            var content = contractInfo.Content;
            if (content == null)
            {
                return Results.NotFound("OpenAPI specification not found");
            }

            var deserializer = new YamlDotNet.Serialization.DeserializerBuilder().Build();
            var document = deserializer.Deserialize<object>(content);
            var json = System.Text.Json.JsonSerializer.Serialize(document);

            return Results.Text(json, "application/json");
        });
    }


}
