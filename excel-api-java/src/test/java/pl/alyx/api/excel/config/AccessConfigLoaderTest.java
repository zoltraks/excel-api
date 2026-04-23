package pl.alyx.api.excel.config;

import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

public class AccessConfigLoaderTest {
    @Test
    public void testConfigLoaderThrowsOnNonExistentFile() {
        AccessConfigLoader loader = new AccessConfigLoader();
        assertThrows(RuntimeException.class, () -> {
            loader.loadAccessConfig();
        });
    }
}
