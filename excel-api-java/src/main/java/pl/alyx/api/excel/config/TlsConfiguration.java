package pl.alyx.api.excel.config;

import org.springframework.boot.web.server.Ssl;
import org.springframework.boot.web.server.WebServerFactoryCustomizer;
import org.springframework.boot.web.servlet.server.ConfigurableServletWebServerFactory;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.nio.file.Paths;
import java.util.Map;

/**
 * Applies the TLS listener configuration from config.yaml (server.tls).
 */
@Configuration
public class TlsConfiguration {

    /**
     * Customizes the web server factory to enable HTTPS when server.tls.enabled is set.
     * @param config the loaded application configuration map
     * @return the web server factory customizer
     */
    @Bean
    @SuppressWarnings("unchecked")
    public WebServerFactoryCustomizer<ConfigurableServletWebServerFactory> tlsCustomizer(
            final Map<String, Object> config) {
        return factory -> {
            Map<String, Object> server = section(config, "server");
            Map<String, Object> tls = section(server, "tls");
            if (tls == null || !Boolean.TRUE.equals(tls.get("enabled"))) {
                return;
            }

            String certFile = (String) tls.get("cert_file");
            String keyFile = (String) tls.get("key_file");
            if (certFile == null || keyFile == null) {
                throw new IllegalStateException(
                        "TLS is enabled but server.tls.cert_file and/or server.tls.key_file are not configured");
            }

            Ssl ssl = new Ssl();
            ssl.setEnabled(true);
            ssl.setCertificate(resolvePath(certFile));
            ssl.setCertificatePrivateKey(resolvePath(keyFile));
            factory.setSsl(ssl);
        };
    }

    @SuppressWarnings("unchecked")
    private static Map<String, Object> section(final Map<String, Object> map, final String key) {
        if (map == null) {
            return null;
        }
        Object value = map.get(key);
        return value instanceof Map ? (Map<String, Object>) value : null;
    }

    private static String resolvePath(final String path) {
        if (Paths.get(path).isAbsolute()) {
            return path;
        }
        String workDir = System.getProperty(
                "excel.api.work.dir",
                System.getenv().getOrDefault("WORK", ""));
        return workDir.isEmpty() ? path : Paths.get(workDir, path).toString();
    }
}
