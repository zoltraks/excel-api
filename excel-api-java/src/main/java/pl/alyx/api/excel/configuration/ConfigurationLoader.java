package pl.alyx.api.excel.configuration;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.dataformat.yaml.YAMLFactory;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;
import pl.alyx.api.excel.utility.ConfigurationPathResolver;
import pl.alyx.api.excel.utility.ConfigurationEnvironmentSupport;

import java.nio.file.Files;
import java.nio.file.Paths;
import java.util.Map;

@Configuration
public class ConfigurationLoader {

    private final WorkbookConfiguration workbookConfiguration;

    public ConfigurationLoader(WorkbookConfiguration workbookConfiguration) {
        this.workbookConfiguration = workbookConfiguration;
    }

    @Bean
    @Primary
    @SuppressWarnings("unchecked")
    public AppConfiguration loadConfiguration() throws Exception {
        String workDir = System.getProperty(
            "excel.api.work.dir",
            System.getenv().getOrDefault("WORK", null)
        );
        String configurationPath = System.getProperty(
            "excel.api.config.path",
            System.getenv().getOrDefault("CONFIG", null)
        );

        String resolvedPath = ConfigurationPathResolver.resolveConfigurationPath(
                workDir, configurationPath, null, false);

        if (!Files.exists(Paths.get(resolvedPath))) {
            throw new RuntimeException("Configuration file not found: " + resolvedPath);
        }

        String content = new String(Files.readAllBytes(Paths.get(resolvedPath)));

        content = ConfigurationEnvironmentSupport.interpolateVariables(content);

        ObjectMapper yamlMapper = new ObjectMapper(new YAMLFactory());
        Map<String, Object> configuration = yamlMapper.readValue(content, Map.class);

        // Resolve lifecycle with override hierarchy: CLI > env > configuration
        String cliLife = System.getProperty("excel.api.life");
        String envLife = System.getenv("LIFE");
        Object configurationLife = configuration.get("lifecycle") instanceof Map
            ? ((Map<?, ?>) configuration.get("lifecycle")).get("life")
            : null;

        if (cliLife != null || envLife != null || configurationLife != null) {
            String resolvedLife = cliLife != null ? cliLife
                    : (envLife != null ? envLife : String.valueOf(configurationLife));
            Map<String, Object> lifecycle = new java.util.HashMap<>();
            lifecycle.put("life", resolvedLife);
            configuration.put("lifecycle", lifecycle);
            System.setProperty("excel.api.life", resolvedLife);
        }

        // Resolve registry directory relative to work directory
        if (configuration.containsKey("registry") && configuration.get("registry") instanceof Map) {
            Map<String, Object> registry = (Map<String, Object>) configuration.get("registry");
            if (registry.containsKey("directory") && registry.get("directory") instanceof String) {
                String registryDir = (String) registry.get("directory");
                if (!Paths.get(registryDir).isAbsolute()) {
                    if (workDir != null && !workDir.isEmpty()) {
                        registry.put("directory", Paths.get(workDir, registryDir).toString());
                    }
                }
            }
        }

        // Resolve lock directory relative to work directory
        if (configuration.containsKey("queue") && configuration.get("queue") instanceof Map) {
            Map<String, Object> queue = (Map<String, Object>) configuration.get("queue");
            if (queue.get("lock_dir") instanceof String) {
                String lockDir = (String) queue.get("lock_dir");
                if (!Paths.get(lockDir).isAbsolute() && workDir != null && !workDir.isEmpty()) {
                    queue.put("lock_dir", Paths.get(workDir, lockDir).toString());
                }
            }
        }

        // Populate WorkbookConfiguration from the configuration map
        workbookConfiguration.loadFromConfigurationMap(configuration);

        return new AppConfiguration(configuration);
    }

}
