package pl.alyx.api.excel.configuration;

import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

public class AccessConfigurationLoaderTest {
    @Test
    public void testConfigurationLoaderThrowsOnNonExistentFile() {
        AccessConfigurationLoader loader = new AccessConfigurationLoader();
        assertThrows(RuntimeException.class, () -> {
            loader.loadAccessConfiguration();
        });
    }
}
