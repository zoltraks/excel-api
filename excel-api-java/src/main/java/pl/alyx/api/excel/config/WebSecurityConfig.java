package pl.alyx.api.excel.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.MediaType;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import pl.alyx.api.excel.metrics.MetricsFilter;
import pl.alyx.api.excel.security.AclAuthorizationFilter;
import pl.alyx.api.excel.security.JwtAuthenticationFilter;
import pl.alyx.api.excel.security.RateLimitFilter;
import pl.alyx.api.excel.security.StaticTokenAuthenticationFilter;

import java.util.Map;

@Configuration
@EnableWebSecurity
public class WebSecurityConfig {

    private static final int STATUS_UNAUTHORIZED = 401;
    private static final int STATUS_FORBIDDEN = 403;

    private final JwtAuthenticationFilter jwtAuthenticationFilter;
    private final StaticTokenAuthenticationFilter staticTokenAuthenticationFilter;
    private final AclAuthorizationFilter aclAuthorizationFilter;
    private final RateLimitFilter rateLimitFilter;
    private final MetricsFilter metricsFilter;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public WebSecurityConfig(
            JwtAuthenticationFilter jwtAuthenticationFilter,
            StaticTokenAuthenticationFilter staticTokenAuthenticationFilter,
            AclAuthorizationFilter aclAuthorizationFilter,
            RateLimitFilter rateLimitFilter,
            MetricsFilter metricsFilter) {
        this.jwtAuthenticationFilter = jwtAuthenticationFilter;
        this.staticTokenAuthenticationFilter = staticTokenAuthenticationFilter;
        this.aclAuthorizationFilter = aclAuthorizationFilter;
        this.rateLimitFilter = rateLimitFilter;
        this.metricsFilter = metricsFilter;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                .csrf(AbstractHttpConfigurer::disable)
                .headers(headers -> headers
                        .contentTypeOptions(org.springframework.security.config.Customizer.withDefaults())
                        .frameOptions(frame -> frame.deny())
                        .referrerPolicy(ref -> ref.policy(
                                org.springframework.security.web.header.writers.ReferrerPolicyHeaderWriter
                                        .ReferrerPolicy.NO_REFERRER))
                )
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers("/auth/token").permitAll()
                        .requestMatchers("/health").permitAll()
                        .requestMatchers("/metrics").permitAll()
                        .requestMatchers("/openapi.yaml").permitAll()
                        .requestMatchers("/openapi.json").permitAll()
                        .anyRequest().authenticated()
                )
                .exceptionHandling(exceptions -> exceptions
                        .authenticationEntryPoint((request, response, authException) -> writeError(
                                response,
                                STATUS_UNAUTHORIZED,
                                "UNAUTHORIZED",
                                "Authentication required"))
                        .accessDeniedHandler((request, response, accessDeniedException) -> writeError(
                                response,
                                STATUS_FORBIDDEN,
                                "FORBIDDEN",
                                "Insufficient permissions"))
                )
                .addFilterBefore(rateLimitFilter, UsernamePasswordAuthenticationFilter.class)
                .addFilterBefore(metricsFilter, UsernamePasswordAuthenticationFilter.class)
                .addFilterBefore(staticTokenAuthenticationFilter, UsernamePasswordAuthenticationFilter.class)
                .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class)
                .addFilterAfter(aclAuthorizationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    private void writeError(
            final HttpServletResponse response,
            final int status,
            final String error,
            final String message) throws java.io.IOException {
        response.setStatus(status);
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        objectMapper.writeValue(response.getWriter(), Map.of(
                "error", error,
                "message", message
        ));
    }
}
