package pl.alyx.api.excel.configuration;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

public class ServerConfigurationTest {
    private ServerConfiguration serverConfiguration;

    @BeforeEach
    public void setUp() {
        serverConfiguration = new ServerConfiguration();
    }

    @Test
    public void testDefaultPort() {
        assertEquals(8443, serverConfiguration.getPort());
    }

    @Test
    public void testSetPort() {
        serverConfiguration.setPort(9000);
        assertEquals(9000, serverConfiguration.getPort());
    }

    @Test
    public void testDefaultHost() {
        assertEquals("0.0.0.0", serverConfiguration.getHost());
    }

    @Test
    public void testSetHost() {
        serverConfiguration.setHost("127.0.0.1");
        assertEquals("127.0.0.1", serverConfiguration.getHost());
    }

    @Test
    public void testDefaultBasePath() {
        assertEquals("/api/v1", serverConfiguration.getBasePath());
    }

    @Test
    public void testSetBasePath() {
        serverConfiguration.setBasePath("/api/v2");
        assertEquals("/api/v2", serverConfiguration.getBasePath());
    }

    @Test
    public void testTlsConfigurationNotNull() {
        assertNotNull(serverConfiguration.getTls());
    }

    @Test
    public void testCorsConfigurationNotNull() {
        assertNotNull(serverConfiguration.getCors());
    }

    @Test
    public void testProfilesNotNull() {
        assertNotNull(serverConfiguration.getProfiles());
    }

    @Test
    public void testSetTlsEnabled() {
        serverConfiguration.getTls().setEnabled(true);
        assertTrue(serverConfiguration.getTls().isEnabled());
    }

    @Test
    public void testSetCorsEnabled() {
        serverConfiguration.getCors().setEnabled(true);
        assertTrue(serverConfiguration.getCors().isEnabled());
    }
}
