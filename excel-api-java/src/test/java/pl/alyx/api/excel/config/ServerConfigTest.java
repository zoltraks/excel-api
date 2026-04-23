package pl.alyx.api.excel.config;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

public class ServerConfigTest {
    private ServerConfig serverConfig;

    @BeforeEach
    public void setUp() {
        serverConfig = new ServerConfig();
    }

    @Test
    public void testDefaultPort() {
        assertEquals(8443, serverConfig.getPort());
    }

    @Test
    public void testSetPort() {
        serverConfig.setPort(9000);
        assertEquals(9000, serverConfig.getPort());
    }

    @Test
    public void testDefaultHost() {
        assertEquals("0.0.0.0", serverConfig.getHost());
    }

    @Test
    public void testSetHost() {
        serverConfig.setHost("127.0.0.1");
        assertEquals("127.0.0.1", serverConfig.getHost());
    }

    @Test
    public void testDefaultBasePath() {
        assertEquals("/api/v1", serverConfig.getBasePath());
    }

    @Test
    public void testSetBasePath() {
        serverConfig.setBasePath("/api/v2");
        assertEquals("/api/v2", serverConfig.getBasePath());
    }

    @Test
    public void testTlsConfigNotNull() {
        assertNotNull(serverConfig.getTls());
    }

    @Test
    public void testCorsConfigNotNull() {
        assertNotNull(serverConfig.getCors());
    }

    @Test
    public void testProfilesNotNull() {
        assertNotNull(serverConfig.getProfiles());
    }

    @Test
    public void testSetTlsEnabled() {
        serverConfig.getTls().setEnabled(true);
        assertTrue(serverConfig.getTls().isEnabled());
    }

    @Test
    public void testSetCorsEnabled() {
        serverConfig.getCors().setEnabled(true);
        assertTrue(serverConfig.getCors().isEnabled());
    }
}
