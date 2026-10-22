package pl.alyx.api.excel;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;

@SpringBootApplication
@ConfigurationPropertiesScan
public class Application {

    public static void main(String[] args) {
        ConfigurationArgs configurationArgs = parseArgs(args);

        // Set system properties for configuration resolution
        if (configurationArgs.workDir != null) {
            System.setProperty("excel.api.work.dir", configurationArgs.workDir);
        }
        if (configurationArgs.configurationPath != null) {
            System.setProperty("excel.api.config.path", configurationArgs.configurationPath);
        }
        if (configurationArgs.accessPath != null) {
            System.setProperty("excel.api.access.path", configurationArgs.accessPath);
        }
        if (configurationArgs.life != null) {
            System.setProperty("excel.api.life", configurationArgs.life);
        }

        SpringApplication.run(Application.class, args);
    }

    private static ConfigurationArgs parseArgs(String[] args) {
        ConfigurationArgs result = new ConfigurationArgs();
        for (int i = 0; i < args.length; i++) {
            if ("--work".equals(args[i]) && i + 1 < args.length) {
                result.workDir = args[i + 1];
                i++;
            } else if ("--config".equals(args[i]) && i + 1 < args.length) {
                result.configurationPath = args[i + 1];
                i++;
            } else if ("--access".equals(args[i]) && i + 1 < args.length) {
                result.accessPath = args[i + 1];
                i++;
            } else if ("--life".equals(args[i]) && i + 1 < args.length) {
                result.life = args[i + 1];
                i++;
            }
        }
        return result;
    }

    private static class ConfigurationArgs {
        String workDir;
        String configurationPath;
        String accessPath;
        String life;
    }
}
