using System;
using System.Collections.Generic;
using System.IO;
using System.Text.RegularExpressions;
using YamlDotNet.Serialization;
using YamlDotNet.Serialization.NamingConventions;

namespace BigBytes.ExcelApi.Options;

public static class OptionsLoader
{
    private static readonly Regex VarPattern = new Regex(@"\$\{([^}]+)\}", RegexOptions.Compiled);

    public static T LoadConfig<T>(string? workDir, string? configPath, bool isAccess) where T : class
    {
        string? accessPath = isAccess ? configPath : null;
        string? actualConfigPath = isAccess ? null : configPath;

        string resolvedPath = OptionsPathResolver.ResolveConfigPath(workDir, actualConfigPath, accessPath, isAccess);

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

        // For WorkbookOptions, extract the registry section first
        if (!isAccess && typeof(T) == typeof(WorkbookOptions))
        {
            var fullConfig = deserializer.Deserialize<Dictionary<string, object>>(content) ??
                throw new InvalidOperationException("Failed to deserialize config");

            if (fullConfig.ContainsKey("registry"))
            {
                var registryYaml = serializer.Serialize(fullConfig["registry"]);
                var workbookConfig = deserializer.Deserialize<T>(registryYaml) ??
                    throw new InvalidOperationException("Failed to deserialize workbook config");

                // Resolve lifecycle with override hierarchy: CLI > env > config
                if (workbookConfig is WorkbookOptions wbConfig)
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

                // Resolve lifecycle with override hierarchy: CLI > env > config (only for WorkbookOptions)
                if (directConfig is WorkbookOptions directWbConfig)
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

        // Resolve lifecycle with override hierarchy: CLI > env > config (only for WorkbookOptions)
        if (!isAccess && config is WorkbookOptions wbConfig2)
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

    public static ServerOptions LoadServerConfig(string? workDir, string? configPath)
    {
        return LoadSection(workDir, configPath, "server", new ServerOptions());
    }

    public static RateLimitOptions LoadRateLimitConfig(string? workDir, string? configPath)
    {
        return LoadSection(workDir, configPath, "rate_limit", new RateLimitOptions());
    }

    public static LoggingOptions LoadLoggingConfig(string? workDir, string? configPath)
    {
        var loggingConfig = LoadSection(workDir, configPath, "logging", new LoggingOptions());
        if (loggingConfig.File != null
            && !string.IsNullOrEmpty(loggingConfig.File.Path)
            && !Path.IsPathRooted(loggingConfig.File.Path)
            && !string.IsNullOrEmpty(workDir))
        {
            loggingConfig.File.Path = Path.Combine(workDir, loggingConfig.File.Path);
        }
        return loggingConfig;
    }

    private static T LoadSection<T>(string? workDir, string? configPath, string section, T fallback) where T : new()
    {
        string resolvedPath = OptionsPathResolver.ResolveConfigPath(workDir, configPath, null, false);

        if (!File.Exists(resolvedPath))
        {
            return fallback;
        }

        string content = File.ReadAllText(resolvedPath);
        content = InterpolateVariables(content);

        var deserializer = new DeserializerBuilder()
            .WithNamingConvention(UnderscoredNamingConvention.Instance)
            .Build();

        var serializer = new SerializerBuilder()
            .WithNamingConvention(UnderscoredNamingConvention.Instance)
            .Build();

        var fullConfig = deserializer.Deserialize<Dictionary<string, object>>(content);
        if (fullConfig != null)
        {
            ApplyProfile(fullConfig);
        }
        if (fullConfig != null && fullConfig.ContainsKey(section))
        {
            var sectionYaml = serializer.Serialize(fullConfig[section]);
            return deserializer.Deserialize<T>(sectionYaml) ?? fallback;
        }

        return fallback;
    }

    public static AuthOptions LoadAuthConfig(string? workDir, string? configPath)
    {
        string resolvedPath = OptionsPathResolver.ResolveConfigPath(workDir, configPath, null, false);

        if (!File.Exists(resolvedPath))
        {
            return new AuthOptions();
        }

        string content = File.ReadAllText(resolvedPath);
        content = InterpolateVariables(content);

        var deserializer = new DeserializerBuilder()
            .WithNamingConvention(UnderscoredNamingConvention.Instance)
            .Build();

        var serializer = new SerializerBuilder()
            .WithNamingConvention(UnderscoredNamingConvention.Instance)
            .Build();

        var fullConfig = deserializer.Deserialize<Dictionary<string, object>>(content);
        if (fullConfig != null && fullConfig.ContainsKey("auth"))
        {
            var authYaml = serializer.Serialize(fullConfig["auth"]);
            return deserializer.Deserialize<AuthOptions>(authYaml) ?? new AuthOptions();
        }

        return new AuthOptions();
    }

    public static QueueOptions LoadQueueConfig(string? workDir, string? configPath)
    {
        string resolvedPath = OptionsPathResolver.ResolveConfigPath(workDir, configPath, null, false);

        if (!File.Exists(resolvedPath))
        {
            return new QueueOptions();
        }

        string content = File.ReadAllText(resolvedPath);
        content = InterpolateVariables(content);

        var deserializer = new DeserializerBuilder()
            .WithNamingConvention(UnderscoredNamingConvention.Instance)
            .Build();

        var serializer = new SerializerBuilder()
            .WithNamingConvention(UnderscoredNamingConvention.Instance)
            .Build();

        var fullConfig = deserializer.Deserialize<Dictionary<string, object>>(content);
        QueueOptions queueConfig = new QueueOptions();
        if (fullConfig != null && fullConfig.ContainsKey("queue"))
        {
            var queueYaml = serializer.Serialize(fullConfig["queue"]);
            queueConfig = deserializer.Deserialize<QueueOptions>(queueYaml) ?? new QueueOptions();
        }

        if (!string.IsNullOrEmpty(queueConfig.LockDir) && !Path.IsPathRooted(queueConfig.LockDir)
            && !string.IsNullOrEmpty(workDir))
        {
            queueConfig.LockDir = Path.Combine(workDir, queueConfig.LockDir);
        }

        return queueConfig;
    }

    private static void ApplyProfile(Dictionary<string, object> config)
    {
        var profileName = Environment.GetEnvironmentVariable("CONFIG_PROFILE");
        if (string.IsNullOrEmpty(profileName)
            || !config.TryGetValue("profiles", out var profilesObj)
            || profilesObj is not Dictionary<object, object> profiles
            || !profiles.TryGetValue(profileName, out var profileObj)
            || profileObj is not Dictionary<object, object> overlay)
        {
            config.Remove("profiles");
            return;
        }

        MergeProfile(config, overlay);
        config.Remove("profiles");
    }

    private static void MergeProfile(Dictionary<string, object> baseMap, Dictionary<object, object> overlay)
    {
        foreach (var kv in overlay)
        {
            if (kv.Key is not string key)
            {
                continue;
            }
            if (baseMap.TryGetValue(key, out var existing)
                && existing is Dictionary<object, object> existingMap
                && kv.Value is Dictionary<object, object> overlayMap)
            {
                var merged = existingMap.ToDictionary(e => e.Key.ToString() ?? "", e => e.Value);
                MergeProfile(merged, overlayMap);
                baseMap[key] = merged;
            }
            else
            {
                baseMap[key] = kv.Value;
            }
        }
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
