package pl.alyx.api.excel.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.web.filter.CorsFilter;

import java.util.List;
import java.util.Map;

@Configuration
public class CorsFilterConfiguration {

    @Bean
    @SuppressWarnings("unchecked")
    public CorsFilter corsFilter(final Map<String, Object> config) {
        final Object serverSection = config.get("server");
        final Object corsSection = serverSection instanceof Map
                ? ((Map<String, Object>) serverSection).get("cors")
                : null;
        final Map<String, Object> cors = corsSection instanceof Map
                ? (Map<String, Object>) corsSection
                : null;

        if (cors == null || Boolean.FALSE.equals(cors.get("enabled"))) {
            return new CorsFilter(new UrlBasedCorsConfigurationSource());
        }

        final Object originsValue = cors.get("allowed_origins");
        final List<String> origins = originsValue instanceof List
                ? (List<String>) originsValue
                : List.of();

        CorsConfiguration corsConfig = new CorsConfiguration();
        if (origins.contains("*")) {
            corsConfig.addAllowedOrigin("*");
            // The CORS spec forbids credentials with a wildcard origin
            corsConfig.setAllowCredentials(false);
        } else {
            origins.forEach(corsConfig::addAllowedOrigin);
            corsConfig.setAllowCredentials(true);
        }
        corsConfig.addAllowedMethod("*");
        corsConfig.addAllowedHeader("*");

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", corsConfig);

        return new CorsFilter(source);
    }
}
