package pl.alyx.api.excel.configuration;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

public class LoggingConfigurationTest {
    private LoggingConfiguration loggingConfiguration;

    @BeforeEach
    public void setUp() {
        loggingConfiguration = new LoggingConfiguration();
    }

    @Test
    public void testDefaultLevel() {
        assertEquals("info", loggingConfiguration.getLevel());
    }

    @Test
    public void testSetLevel() {
        loggingConfiguration.setLevel("debug");
        assertEquals("debug", loggingConfiguration.getLevel());
    }

    @Test
    public void testDefaultFormat() {
        assertEquals("json", loggingConfiguration.getFormat());
    }

    @Test
    public void testSetFormat() {
        loggingConfiguration.setFormat("text");
        assertEquals("text", loggingConfiguration.getFormat());
    }

    @Test
    public void testFileConfigurationNotNull() {
        assertNotNull(loggingConfiguration.getFile());
    }

    @Test
    public void testDefaultFileEnabled() {
        assertFalse(loggingConfiguration.getFile().isEnabled());
    }

    @Test
    public void testSetFileEnabled() {
        loggingConfiguration.getFile().setEnabled(true);
        assertTrue(loggingConfiguration.getFile().isEnabled());
    }

    @Test
    public void testDefaultFilePath() {
        assertEquals("/var/log/excel-api/excel-api-java.log", loggingConfiguration.getFile().getPath());
    }

    @Test
    public void testSetFilePath() {
        loggingConfiguration.getFile().setPath("/tmp/test.log");
        assertEquals("/tmp/test.log", loggingConfiguration.getFile().getPath());
    }

    @Test
    public void testDefaultMaxFiles() {
        assertEquals(7, loggingConfiguration.getFile().getMaxFiles());
    }

    @Test
    public void testSetMaxFiles() {
        loggingConfiguration.getFile().setMaxFiles(30);
        assertEquals(30, loggingConfiguration.getFile().getMaxFiles());
    }
}
