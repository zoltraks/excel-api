using System;
using System.IO;
using System.Text.RegularExpressions;
using YamlDotNet.Serialization;
using YamlDotNet.Serialization.NamingConventions;

namespace BigBytes.ExcelApi.Config;

public static class ConfigLoader
{
    private static readonly Regex VarPattern = new Regex(@"\$\{([^}]+}\)", RegexOptions.Compiled);

    public static T LoadConfig<T>(string? workDir, string? configPath, bool isAccess) where T : class
    {
        string? accessPath = isAccess ? configPath : null;
        string? actualConfigPath = isAccess ? null : configPath;

        string resolvedPath = ConfigPathResolver.ResolveConfigPath(workDir, actualConfigPath, accessPath, isAccess);

        if (!File.Exists(resolvedPath))
        {
            throw new FileNotFoundException($"Config file not found: {resolvedPath}");
        }

        if (isAccess)
        {
            // Check file permissions (should be 0600)
            try
            {
                var fileInfo = new FileInfo(resolvedPath);
                if (OperatingSystem.IsLinux() || OperatingSystem.IsMacOS())
                {
                    var mode = fileInfo.UnixFileMode;
                    var permissions = (UnixFileMode)511;
                    var requiredPermissions = (UnixFileMode)384;
                    if ((mode & permissions) != requiredPermissions)
                    {
                        Console.Error.WriteLine($"WARNING: access.yaml has insecure permissions: {Convert.ToString((int)mode, 8)} (should be 600)");
                    }
                }
            }
            catch (Exception)
            {
                // Windows or non-POSIX system, skip permission check
            }
        }

        string content = File.ReadAllText(resolvedPath);

        // Apply variable interpolation
        content = InterpolateVariables(content);

        var deserializer = new DeserializerBuilder()
            .WithNamingConvention(UnderscoredNamingConvention.Instance)
            .Build();

        return deserializer.Deserialize<T>(content) ?? throw new InvalidOperationException("Failed to deserialize config");
    }

    private static string InterpolateVariables(string content)
    {
        return VarPattern.Replace(content, match =>
        {
            string varName = match.Groups[1].Value;
            string? envValue = Environment.GetEnvironmentVariable(varName);
            if (envValue == null)
            {
                throw new InvalidOperationException($"Environment variable {varName} not found for interpolation");
            }
            return envValue;
        });
    }
}
