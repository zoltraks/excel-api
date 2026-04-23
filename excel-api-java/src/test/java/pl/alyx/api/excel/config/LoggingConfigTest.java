package pl.alyx.api.excel.config;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

public class LoggingConfigTest {
    private LoggingConfig loggingConfig;

    @BeforeEach
    public void setUp() {
        loggingConfig = new LoggingConfig();
    }

    @Test
    public void testDefaultLevel() {
        assertEquals("info", loggingConfig.getLevel());
    }

    @Test
    public void testSetLevel() {
        loggingConfig.setLevel("debug");
        assertEquals("debug", loggingConfig.getLevel());
    }

    @Test
    public void testDefaultFormat() {
        assertEquals("json", loggingConfig.getFormat());
    }

    @Test
    public void testSetFormat() {
        loggingConfig.setFormat("text");
        assertEquals("text", loggingConfig.getFormat());
    }

    @Test
    public void testFileConfigNotNull() {
        assertNotNull(loggingConfig.getFile());
    }

    @Test
    public void testDefaultFileEnabled() {
        assertFalse(loggingConfig.getFile().isEnabled());
    }

    @Test
    public void testSetFileEnabled() {
        loggingConfig.getFile().setEnabled(true);
        assertTrue(loggingConfig.getFile().isEnabled());
    }

    @Test
    public void testDefaultFilePath() {
        assertEquals("/var/log/excel-api/excel-api-java.log", loggingConfig.getFile().getPath());
    }

    @Test
    public void testSetFilePath() {
        loggingConfig.getFile().setPath("/tmp/test.log");
        assertEquals("/tmp/test.log", loggingConfig.getFile().getPath());
    }

    @Test
    public void testDefaultMaxFiles() {
        assertEquals(7, loggingConfig.getFile().getMaxFiles());
    }

    @Test
    public void testSetMaxFiles() {
        loggingConfig.getFile().setMaxFiles(30);
        assertEquals(30, loggingConfig.getFile().getMaxFiles());
    }
}
