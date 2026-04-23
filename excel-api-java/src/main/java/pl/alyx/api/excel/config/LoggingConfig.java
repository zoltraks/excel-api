package pl.alyx.api.excel.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = "logging")
public class LoggingConfig {
    private String level = "info";
    private String format = "json";
    private FileLogConfig file = new FileLogConfig();

    public String getLevel() {
        return level;
    }

    public void setLevel(String level) {
        this.level = level;
    }

    public String getFormat() {
        return format;
    }

    public void setFormat(String format) {
        this.format = format;
    }

    public FileLogConfig getFile() {
        return file;
    }

    public void setFile(FileLogConfig file) {
        this.file = file;
    }

    public static class FileLogConfig {
        private boolean enabled = false;
        private String path = "/var/log/excel-api/excel-api-java.log";
        private int maxFiles = 7;

        public boolean isEnabled() {
            return enabled;
        }

        public void setEnabled(boolean enabled) {
            this.enabled = enabled;
        }

        public String getPath() {
            return path;
        }

        public void setPath(String path) {
            this.path = path;
        }

        public int getMaxFiles() {
            return maxFiles;
        }

        public void setMaxFiles(int maxFiles) {
            this.maxFiles = maxFiles;
        }
    }
}
