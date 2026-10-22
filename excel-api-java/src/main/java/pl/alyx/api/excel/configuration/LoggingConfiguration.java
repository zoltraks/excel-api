package pl.alyx.api.excel.configuration;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = "logging")
public class LoggingConfiguration {
    private String level = "info";
    private String format = "json";
    private FileLogConfiguration file = new FileLogConfiguration();

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

    public FileLogConfiguration getFile() {
        return file;
    }

    public void setFile(FileLogConfiguration file) {
        this.file = file;
    }

    public static class FileLogConfiguration {
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
