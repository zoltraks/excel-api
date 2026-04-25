package pl.alyx.api.excel.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.dataformat.yaml.YAMLFactory;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;

import java.nio.file.Files;
import java.nio.file.Paths;
import java.util.Map;

@Configuration
public class ConfigLoader {

    private final WorkbookConfig workbookConfig;

    public ConfigLoader(WorkbookConfig workbookConfig) {
        this.workbookConfig = workbookConfig;
    }

    @Bean
    @Primary
    @SuppressWarnings("unchecked")
    public Map<String, Object> loadConfig() throws Exception {
        String workDir = System.getProperty(
            "excel.api.work.dir",
            System.getenv().getOrDefault("WORK", null)
        );
        String configPath = System.getProperty(
            "excel.api.config.path",
            System.getenv().getOrDefault("CONFIG", null)
        );

        String resolvedPath = ConfigPathResolver.resolveConfigPath(workDir, configPath, null, false);

        if (!Files.exists(Paths.get(resolvedPath))) {
            throw new RuntimeException("Config file not found: " + resolvedPath);
        }

        String content = new String(Files.readAllBytes(Paths.get(resolvedPath)));

        content = ConfigSupport.interpolateVariables(content);

        ObjectMapper yamlMapper = new ObjectMapper(new YAMLFactory());
        Map<String, Object> config = yamlMapper.readValue(content, Map.class);

        // Resolve lifecycle with override hierarchy: CLI > env > config
        String cliLife = System.getProperty("excel.api.life");
        String envLife = System.getenv("LIFE");
        Object configLife = config.get("lifecycle") instanceof Map
            ? ((Map<?, ?>) config.get("lifecycle")).get("life")
            : null;

        if (cliLife != null || envLife != null || configLife != null) {
            String resolvedLife = cliLife != null ? cliLife : (envLife != null ? envLife : String.valueOf(configLife));
            Map<String, Object> lifecycle = new java.util.HashMap<>();
            lifecycle.put("life", resolvedLife);
            config.put("lifecycle", lifecycle);
            System.setProperty("excel.api.life", resolvedLife);
        }

        // Resolve registry directory relative to work directory
        if (config.containsKey("registry") && config.get("registry") instanceof Map) {
            Map<String, Object> registry = (Map<String, Object>) config.get("registry");
            if (registry.containsKey("directory") && registry.get("directory") instanceof String) {
                String registryDir = (String) registry.get("directory");
                if (!Paths.get(registryDir).isAbsolute()) {
                    if (workDir != null && !workDir.isEmpty()) {
                        registry.put("directory", Paths.get(workDir, registryDir).toString());
                    }
                }
            }
        }

        // Populate WorkbookConfig from the config map
        workbookConfig.loadFromConfigMap(config);

        return config;
    }

}
