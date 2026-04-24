using System;
using System.Collections.Generic;
using System.IO;
using System.Text.RegularExpressions;
using YamlDotNet.Serialization;
using YamlDotNet.Serialization.NamingConventions;

namespace BigBytes.ExcelApi.Config;

public static class ConfigLoader
{
    private static readonly Regex VarPattern = new Regex(@"\$\{([^}]+)\}", RegexOptions.Compiled);

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

        var serializer = new SerializerBuilder()
            .WithNamingConvention(UnderscoredNamingConvention.Instance)
            .Build();

        // For WorkbookConfig, extract the registry section first
        if (!isAccess && typeof(T) == typeof(WorkbookConfig))
        {
            var fullConfig = deserializer.Deserialize<Dictionary<string, object>>(content) ??
                throw new InvalidOperationException("Failed to deserialize config");

            if (fullConfig.ContainsKey("registry"))
            {
                var registryYaml = serializer.Serialize(fullConfig["registry"]);
                var workbookConfig = deserializer.Deserialize<T>(registryYaml) ??
                    throw new InvalidOperationException("Failed to deserialize workbook config");

                // Resolve lifecycle with override hierarchy: CLI > env > config
                if (workbookConfig is WorkbookConfig wbConfig)
                {
                    string? envLife = Environment.GetEnvironmentVariable("LIFE");
                    string? configLife = wbConfig.Lifecycle?.Life;

                    if (envLife != null || configLife != null)
                    {
                        string resolvedLife = envLife ?? configLife ?? string.Empty;
                        wbConfig.Lifecycle = new LifecycleConfig { Life = resolvedLife };
                    }

                    // Resolve registry directory relative to work directory
                    if (!string.IsNullOrEmpty(wbConfig.Directory) && !Path.IsPathRooted(wbConfig.Directory))
                    {
                        if (!string.IsNullOrEmpty(workDir))
                        {
                            wbConfig.Directory = Path.Combine(workDir, wbConfig.Directory);
                        }
                    }

                    // Resolve workbook paths relative to registry directory
                    foreach (var workbook in wbConfig.Workbooks)
                    {
                        if (!string.IsNullOrEmpty(workbook.Path) && !Path.IsPathRooted(workbook.Path))
                        {
                            workbook.Path = Path.Combine(wbConfig.Directory, workbook.Path);
                        }
                    }
                }

                return workbookConfig;
            }
            // If no registry section, deserialize the whole config directly
            // This allows tests to use simplified config structures
            else
            {
                var directConfig = deserializer.Deserialize<T>(content) ?? throw new InvalidOperationException("Failed to deserialize config");

                // Resolve lifecycle with override hierarchy: CLI > env > config (only for WorkbookConfig)
                if (directConfig is WorkbookConfig directWbConfig)
                {
                    string? envLife = Environment.GetEnvironmentVariable("LIFE");
                    string? configLife = directWbConfig.Lifecycle?.Life;

                    if (envLife != null || configLife != null)
                    {
                        string resolvedLife = envLife ?? configLife ?? string.Empty;
                        directWbConfig.Lifecycle = new LifecycleConfig { Life = resolvedLife };
                    }
                }

                return directConfig;
            }
        }

        var config = deserializer.Deserialize<T>(content) ?? throw new InvalidOperationException("Failed to deserialize config");

        // Resolve lifecycle with override hierarchy: CLI > env > config (only for WorkbookConfig)
        if (!isAccess && config is WorkbookConfig wbConfig2)
        {
            string? envLife = Environment.GetEnvironmentVariable("LIFE");
            string? configLife = wbConfig2.Lifecycle?.Life;

            if (envLife != null || configLife != null)
            {
                string resolvedLife = envLife ?? configLife ?? string.Empty;
                wbConfig2.Lifecycle = new LifecycleConfig { Life = resolvedLife };
            }
        }

        return config;
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
