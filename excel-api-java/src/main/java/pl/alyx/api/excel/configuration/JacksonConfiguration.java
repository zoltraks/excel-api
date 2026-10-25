package pl.alyx.api.excel.configuration;

import java.util.Map;

import org.springframework.boot.autoconfigure.jackson.Jackson2ObjectMapperBuilderCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Applies {@code server.json.pretty} from config.yaml to the shared Jackson
 * configuration so every JSON response serializes with two-space indentation
 * when the flag is enabled.
 */
@Configuration
public class JacksonConfiguration {

    /**
     * Resolves the pretty flag once and returns a customizer that applies it
     * to every ObjectMapper built through the Spring builder.
     *
     * @param configuration the loaded application configuration
     * @return the builder customizer
     */
    @Bean
    @SuppressWarnings("unchecked")
    public Jackson2ObjectMapperBuilderCustomizer jsonPrettyCustomizer(final AppConfiguration configuration) {
        return builder -> builder.indentOutput(isPretty(configuration));
    }

    /**
     * Reads {@code server.json.pretty} from the configuration map.
     *
     * @param configuration the loaded application configuration
     * @return true when pretty output is enabled
     */
    @SuppressWarnings("unchecked")
    public static boolean isPretty(final AppConfiguration configuration) {
        final Object serverSection = configuration.get("server");
        final Object jsonSection = serverSection instanceof Map
                ? ((Map<String, Object>) serverSection).get("json")
                : null;
        return jsonSection instanceof Map
                && Boolean.TRUE.equals(((Map<String, Object>) jsonSection).get("pretty"));
    }
}
