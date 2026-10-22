package pl.alyx.api.excel.configuration;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.dataformat.yaml.YAMLFactory;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import pl.alyx.api.excel.utility.ConfigurationPathResolver;
import pl.alyx.api.excel.utility.ConfigurationEnvironmentSupport;

import java.nio.file.Files;
import java.nio.file.Paths;
import java.nio.file.attribute.PosixFilePermissions;

@Configuration
public class AccessConfigurationLoader {

    @Bean
    @ConfigurationProperties(prefix = "auth")
    public AccessConfiguration loadAccessConfiguration() throws Exception {
        String workDir = System.getProperty(
            "excel.api.work.dir",
            System.getenv().getOrDefault("WORK", null)
        );
        String accessPath = System.getProperty(
            "excel.api.access.path",
            System.getenv().getOrDefault("ACCESS", null)
        );

        String resolvedPath = ConfigurationPathResolver.resolveConfigurationPath(workDir, null, accessPath, true);

        if (!Files.exists(Paths.get(resolvedPath))) {
            throw new RuntimeException("Access file not found: " + resolvedPath);
        }

        // Check file permissions (should be 0600)
        try {
            var permissions = Files.getPosixFilePermissions(Paths.get(resolvedPath));
            var mode = PosixFilePermissions.toString(permissions);
            if (!mode.equals("rw-------")) {
                System.err.println("WARNING: access.yaml has insecure permissions: " + mode + " (should be 600)");
            }
        } catch (UnsupportedOperationException e) {
            // Windows or non-POSIX system, skip permission check
        }

        String content = new String(Files.readAllBytes(Paths.get(resolvedPath)));

        content = ConfigurationEnvironmentSupport.interpolateVariables(content);

        ObjectMapper yamlMapper = new ObjectMapper(new YAMLFactory());
        return yamlMapper.readValue(content, AccessConfiguration.class);
    }

}
