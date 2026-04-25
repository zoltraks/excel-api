package pl.alyx.api.excel.config;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.nio.file.Files;
import java.nio.file.Paths;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

class ConfigLoaderTest {
    private static final String TEMP_DIR = "/tmp/excel-api-test";
    private static final String CONFIG_PATH = TEMP_DIR + "/config.yaml";

    @BeforeEach
    void setUp() throws Exception {
        Files.createDirectories(Paths.get(TEMP_DIR));
    }

    @AfterEach
    void tearDown() throws Exception {
        if (Files.exists(Paths.get(TEMP_DIR))) {
            Files.deleteIfExists(Paths.get(CONFIG_PATH));
            Files.deleteIfExists(Paths.get(TEMP_DIR));
        }
    }

    @Test
    void shouldResolveLifecycleFromConfigFile() throws Exception {
        String configContent = """
server:
  port: 8443
  host: 0.0.0.0
  base_path: /api/v1
  tls:
    enabled: false
openapi:
  title: Excel API
  description: API for Excel file operations
  servers:
    - url: http://localhost:8443/api/v1
      description: Local server
registry:
  directory: /data/workbooks
  workbooks: []
queue:
  batch_max_size: 100
  batch_debounce_ms: 100
  lock_timeout_ms: 5000
  lock_dir: /tmp/excel-api/locks
cache:
  enabled: true
  invalidation: mtime
  poll_interval_ms: 1000
auth:
  mode: jwt
  jwt:
    issuer: excel-api
    expiration_minutes: 60
    algorithm: HS256
logging:
  level: info
  format: json
lifecycle:
  life: 30s
""";
        Files.writeString(Paths.get(CONFIG_PATH), configContent);
        System.setProperty("excel.api.config.path", CONFIG_PATH);

        WorkbookConfig workbookConfig = new WorkbookConfig();
        ConfigLoader loader = new ConfigLoader(workbookConfig);
        Map<String, Object> config = loader.loadConfig();

        assertNotNull(config.get("lifecycle"));
        Map<?, ?> lifecycle = (Map<?, ?>) config.get("lifecycle");
        assertEquals("30s", lifecycle.get("life"));

        System.clearProperty("excel.api.config.path");
    }

    @Test
    void shouldOverrideLifecycleWithCLIArgument() throws Exception {
        String configContent = """
server:
  port: 8443
  host: 0.0.0.0
  base_path: /api/v1
  tls:
    enabled: false
openapi:
  title: Excel API
  description: API for Excel file operations
  servers:
    - url: http://localhost:8443/api/v1
      description: Local server
registry:
  directory: /data/workbooks
  workbooks: []
queue:
  batch_max_size: 100
  batch_debounce_ms: 100
  lock_timeout_ms: 5000
  lock_dir: /tmp/excel-api/locks
cache:
  enabled: true
  invalidation: mtime
  poll_interval_ms: 1000
auth:
  mode: jwt
  jwt:
    issuer: excel-api
    expiration_minutes: 60
    algorithm: HS256
logging:
  level: info
  format: json
lifecycle:
  life: 30s
""";
        Files.writeString(Paths.get(CONFIG_PATH), configContent);
        System.setProperty("excel.api.config.path", CONFIG_PATH);
        System.setProperty("LIFE", "60s");
        System.setProperty("excel.api.life", "90s");

        WorkbookConfig workbookConfig = new WorkbookConfig();
        ConfigLoader loader = new ConfigLoader(workbookConfig);
        Map<String, Object> config = loader.loadConfig();

        assertNotNull(config.get("lifecycle"));
        Map<?, ?> lifecycle = (Map<?, ?>) config.get("lifecycle");
        assertEquals("90s", lifecycle.get("life"));

        System.clearProperty("excel.api.config.path");
        System.clearProperty("LIFE");
        System.clearProperty("excel.api.life");
    }

    @Test
    void shouldNotSetLifecycleIfNoneProvided() throws Exception {
        String configContent = """
server:
  port: 8443
  host: 0.0.0.0
  base_path: /api/v1
  tls:
    enabled: false
openapi:
  title: Excel API
  description: API for Excel file operations
  servers:
    - url: http://localhost:8443/api/v1
      description: Local server
registry:
  directory: /data/workbooks
  workbooks: []
queue:
  batch_max_size: 100
  batch_debounce_ms: 100
  lock_timeout_ms: 5000
  lock_dir: /tmp/excel-api/locks
cache:
  enabled: true
  invalidation: mtime
  poll_interval_ms: 1000
auth:
  mode: jwt
  jwt:
    issuer: excel-api
    expiration_minutes: 60
    algorithm: HS256
logging:
  level: info
  format: json
""";
        Files.writeString(Paths.get(CONFIG_PATH), configContent);
        System.setProperty("excel.api.config.path", CONFIG_PATH);

        WorkbookConfig workbookConfig = new WorkbookConfig();
        ConfigLoader loader = new ConfigLoader(workbookConfig);
        Map<String, Object> config = loader.loadConfig();

        assertNull(config.get("lifecycle"));

        System.clearProperty("excel.api.config.path");
    }
}
