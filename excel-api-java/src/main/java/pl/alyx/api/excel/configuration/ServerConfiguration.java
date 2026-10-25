package pl.alyx.api.excel.configuration;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;
import java.util.HashMap;

@Component
@ConfigurationProperties(prefix = "server")
public class ServerConfiguration {
    private static final int DEFAULT_PORT = 8443;

    private int port = DEFAULT_PORT;
    private String host = "0.0.0.0";
    private String basePath = "/api/v1";
    private TlsConfiguration tls = new TlsConfiguration();
    private CorsConfiguration cors = new CorsConfiguration();

    public int getPort() {
        return port;
    }

    public void setPort(int port) {
        this.port = port;
    }

    public String getHost() {
        return host;
    }

    public void setHost(String host) {
        this.host = host;
    }

    public String getBasePath() {
        return basePath;
    }

    public void setBasePath(String basePath) {
        this.basePath = basePath;
    }

    public TlsConfiguration getTls() {
        return tls;
    }

    public void setTls(TlsConfiguration tls) {
        this.tls = tls;
    }

    public CorsConfiguration getCors() {
        return cors;
    }

    public void setCors(CorsConfiguration cors) {
        this.cors = cors;
    }

    public static class TlsConfiguration {
        private boolean enabled = false;

        public boolean isEnabled() {
            return enabled;
        }

        public void setEnabled(boolean enabled) {
            this.enabled = enabled;
        }
    }

    public static class CorsConfiguration {
        private boolean enabled = true;
        private String[] allowedOrigins = new String[]{"*"};
        private String[] allowedMethods = new String[]{"GET", "POST", "PUT", "DELETE", "OPTIONS"};
        private String[] allowedHeaders = new String[]{"Content-Type", "Authorization"};

        public boolean isEnabled() {
            return enabled;
        }

        public void setEnabled(boolean enabled) {
            this.enabled = enabled;
        }

        public String[] getAllowedOrigins() {
            return allowedOrigins;
        }

        public void setAllowedOrigins(String[] allowedOrigins) {
            this.allowedOrigins = allowedOrigins;
        }

        public String[] getAllowedMethods() {
            return allowedMethods;
        }

        public void setAllowedMethods(String[] allowedMethods) {
            this.allowedMethods = allowedMethods;
        }

        public String[] getAllowedHeaders() {
            return allowedHeaders;
        }

        public void setAllowedHeaders(String[] allowedHeaders) {
            this.allowedHeaders = allowedHeaders;
        }
    }
}
