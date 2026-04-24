package pl.alyx.api.excel.config;

import java.nio.file.Paths;

public class ConfigPathResolver {

    public static String resolveConfigPath(String workDir, String configPath, String accessPath, boolean isAccess) {
        String targetPath = isAccess ? accessPath : configPath;
        String defaultFileName = isAccess ? "access.yaml" : "config.yaml";

        // Step 1: If --config/--access parameter or CONFIG/ACCESS env var is specified
        if (targetPath != null && !targetPath.isEmpty()) {
            if (workDir != null && !workDir.isEmpty() && !Paths.get(targetPath).isAbsolute()) {
                return Paths.get(workDir, targetPath).toString();
            }
            return targetPath;
        }

        // Step 2: If --work parameter or WORK env var is specified
        if (workDir != null && !workDir.isEmpty()) {
            return Paths.get(workDir, "config", defaultFileName).toString();
        }

        // Step 3: Use default path from current working directory
        return "config/" + defaultFileName;
    }
}
