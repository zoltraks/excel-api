package pl.alyx.api.excel.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.dataformat.yaml.YAMLFactory;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.nio.file.Files;
import java.nio.file.Paths;
import java.nio.file.attribute.PosixFilePermissions;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Configuration
public class AccessConfigLoader {

    private static final Pattern VAR_PATTERN = Pattern.compile("\\$\\{([^}]+)\\}");

    @Bean
    @ConfigurationProperties(prefix = "auth")
    public AccessConfig loadAccessConfig() throws Exception {
        String accessPath = System.getenv().getOrDefault("ACCESS_PATH", "/etc/excel-api/access.yaml");

        if (!Files.exists(Paths.get(accessPath))) {
            throw new RuntimeException("Access file not found: " + accessPath);
        }

        // Check file permissions (should be 0600)
        try {
            var permissions = Files.getPosixFilePermissions(Paths.get(accessPath));
            var mode = PosixFilePermissions.toString(permissions);
            if (!mode.equals("rw-------")) {
                System.err.println("WARNING: access.yaml has insecure permissions: " + mode + " (should be 600)");
            }
        } catch (UnsupportedOperationException e) {
            // Windows or non-POSIX system, skip permission check
        }

        String content = new String(Files.readAllBytes(Paths.get(accessPath)));

        // Apply variable interpolation
        content = interpolateVariables(content);

        ObjectMapper yamlMapper = new ObjectMapper(new YAMLFactory());
        return yamlMapper.readValue(content, AccessConfig.class);
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
