package pl.alyx.api.excel.config;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

class ConfigSupportTest {

    @Test
    void interpolateVariables_noPlaceholders_returnsUnchanged() {
        String input = "value: plain_text";
        assertEquals(input, ConfigSupport.interpolateVariables(input));
    }

    @Test
    void interpolateVariables_missingEnvVar_throwsRuntime() {
        assertThrows(RuntimeException.class,
                () -> ConfigSupport.interpolateVariables("value: ${THIS_VAR_DOES_NOT_EXIST_XYZ123}"));
    }

    @Test
    void interpolateVariables_multiplePlaceholders() {
        String result = ConfigSupport.interpolateVariables("no placeholders here");
        assertEquals("no placeholders here", result);
    }
}
