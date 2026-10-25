using YamlDotNet.Serialization;

namespace BigBytes.ExcelApi.Services;

/// <summary>
/// Loads the synced OpenAPI contract resource once and exposes its identity fields.
/// </summary>
public class ContractInfo
{
    public ContractInfo()
    {
        var assembly = System.Reflection.Assembly.GetExecutingAssembly();
        var resourceName = "BigBytes.ExcelApi.Resources.openapi.yaml";
        var stream = assembly.GetManifestResourceStream(resourceName)
            ?? assembly.GetManifestResourceStream("ExcelApi.Resources.openapi.yaml");

        if (stream == null)
        {
            throw new InvalidOperationException("Embedded OpenAPI contract resource not found");
        }

        using var reader = new StreamReader(stream);
        Content = reader.ReadToEnd();

        var document = new DeserializerBuilder().Build()
            .Deserialize<Dictionary<object, object>>(Content);
        if (document != null
            && document.TryGetValue("info", out var info)
            && info is Dictionary<object, object> infoMap
            && infoMap.TryGetValue("version", out var version))
        {
            Version = version?.ToString() ?? "";
        }
        else
        {
            Version = "";
        }
    }

    public string Content { get; }

    public string Version { get; }
}
