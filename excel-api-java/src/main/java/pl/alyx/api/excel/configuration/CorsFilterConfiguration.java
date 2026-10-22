package pl.alyx.api.excel.configuration;

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
    public CorsFilter corsFilter(final AppConfiguration configuration) {
        final Object serverSection = configuration.get("server");
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

        CorsConfiguration corsConfiguration = new CorsConfiguration();
        if (origins.contains("*")) {
            corsConfiguration.addAllowedOrigin("*");
            // The CORS spec forbids credentials with a wildcard origin
            corsConfiguration.setAllowCredentials(false);
        } else {
            origins.forEach(corsConfiguration::addAllowedOrigin);
            corsConfiguration.setAllowCredentials(true);
        }
        corsConfiguration.addAllowedMethod("*");
        corsConfiguration.addAllowedHeader("*");

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", corsConfiguration);

        return new CorsFilter(source);
    }
}
