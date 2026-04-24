package pl.alyx.api.excel.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.dataformat.yaml.YAMLFactory;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;

import java.nio.file.Files;
import java.nio.file.Paths;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Configuration
public class ConfigLoader {

    private static final Pattern VAR_PATTERN = Pattern.compile("\\$\\{([^}]+)\\}");

    @Bean
    @Primary
    @ConfigurationProperties
    @SuppressWarnings("unchecked")
    public Map<String, Object> loadConfig() throws Exception {
        String workDir = System.getProperty("excel.api.work.dir", System.getenv().getOrDefault("WORK", null));
        String configPath = System.getProperty("excel.api.config.path", System.getenv().getOrDefault("CONFIG", null));

        String resolvedPath = ConfigPathResolver.resolveConfigPath(workDir, configPath, null, false);

        if (!Files.exists(Paths.get(resolvedPath))) {
            throw new RuntimeException("Config file not found: " + resolvedPath);
        }

        String content = new String(Files.readAllBytes(Paths.get(resolvedPath)));

        // Apply variable interpolation
        content = interpolateVariables(content);

        ObjectMapper yamlMapper = new ObjectMapper(new YAMLFactory());
        return yamlMapper.readValue(content, Map.class);
    }

    private static String interpolateVariables(String content) {
        Matcher matcher = VAR_PATTERN.matcher(content);
        StringBuffer result = new StringBuffer();
        while (matcher.find()) {
            String varName = matcher.group(1);
            String envValue = System.getenv(varName);
            if (envValue == null) {
                throw new RuntimeException("Environment variable " + varName + " not found for interpolation");
            }
            matcher.appendReplacement(result, envValue);
        }
        matcher.appendTail(result);
        return result.toString();
    }
}
