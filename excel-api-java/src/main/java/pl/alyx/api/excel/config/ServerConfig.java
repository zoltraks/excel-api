package pl.alyx.api.excel.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;
import java.util.HashMap;
import java.util.Map;

@Component
@ConfigurationProperties(prefix = "server")
public class ServerConfig {
    private static final int DEFAULT_PORT = 8443;

    private int port = DEFAULT_PORT;
    private String host = "0.0.0.0";
    private String basePath = "/api/v1";
    private TlsConfig tls = new TlsConfig();
    private CorsConfig cors = new CorsConfig();
    private Map<String, ServerProfile> profiles = new HashMap<>();

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

    public TlsConfig getTls() {
        return tls;
    }

    public void setTls(TlsConfig tls) {
        this.tls = tls;
    }

    public CorsConfig getCors() {
        return cors;
    }

    public void setCors(CorsConfig cors) {
        this.cors = cors;
    }

    public Map<String, ServerProfile> getProfiles() {
        return profiles;
    }

    public void setProfiles(Map<String, ServerProfile> profiles) {
        this.profiles = profiles;
    }

    public static class ServerProfile {
        private Integer port;
        private String host;
        private String basePath;
        private TlsConfig tls;
        private CorsConfig cors;

        public Integer getPort() {
            return port;
        }

        public void setPort(Integer port) {
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

        public TlsConfig getTls() {
            return tls;
        }

        public void setTls(TlsConfig tls) {
            this.tls = tls;
        }

        public CorsConfig getCors() {
            return cors;
        }

        public void setCors(CorsConfig cors) {
            this.cors = cors;
        }
    }

    public static class TlsConfig {
        private boolean enabled = false;

        public boolean isEnabled() {
            return enabled;
        }

        public void setEnabled(boolean enabled) {
            this.enabled = enabled;
        }
    }

    public static class CorsConfig {
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
