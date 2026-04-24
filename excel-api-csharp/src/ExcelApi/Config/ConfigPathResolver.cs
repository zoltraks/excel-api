using System;
using System.IO;

namespace BigBytes.ExcelApi.Config;

public static class ConfigPathResolver
{
    public static string ResolveConfigPath(string? workDir, string? configPath, string? accessPath, bool isAccess)
    {
        string? targetPath = isAccess ? accessPath : configPath;
        string defaultFileName = isAccess ? "access.yaml" : "config.yaml";

        // Step 1: If --config/--access parameter or CONFIG/ACCESS env var is specified
        if (!string.IsNullOrEmpty(targetPath))
        {
            if (!string.IsNullOrEmpty(workDir) && !Path.IsPathRooted(targetPath))
            {
                return Path.Combine(workDir, targetPath);
            }
            return targetPath;
        }

        // Step 2: If --work parameter or WORK env var is specified
        if (!string.IsNullOrEmpty(workDir))
        {
            return Path.Combine(workDir, "config", defaultFileName);
        }

        // Step 3: Use default path from current working directory
        return Path.Combine("config", defaultFileName);
    }
}
