package pl.alyx.api.excel;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;

@SpringBootApplication
@ConfigurationPropertiesScan
public class Application {

    public static void main(String[] args) {
        ConfigArgs configArgs = parseArgs(args);

        // Set system properties for config resolution
        if (configArgs.workDir != null) {
            System.setProperty("excel.api.work.dir", configArgs.workDir);
        }
        if (configArgs.configPath != null) {
            System.setProperty("excel.api.config.path", configArgs.configPath);
        }
        if (configArgs.accessPath != null) {
            System.setProperty("excel.api.access.path", configArgs.accessPath);
        }

        SpringApplication.run(Application.class, args);
    }

    private static ConfigArgs parseArgs(String[] args) {
        ConfigArgs result = new ConfigArgs();
        for (int i = 0; i < args.length; i++) {
            if ("--work".equals(args[i]) && i + 1 < args.length) {
                result.workDir = args[i + 1];
                i++;
            } else if ("--config".equals(args[i]) && i + 1 < args.length) {
                result.configPath = args[i + 1];
                i++;
            } else if ("--access".equals(args[i]) && i + 1 < args.length) {
                result.accessPath = args[i + 1];
                i++;
            }
        }
        return result;
    }

    private static class ConfigArgs {
        String workDir;
        String configPath;
        String accessPath;
    }
}
