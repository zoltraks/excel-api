package pl.alyx.api.excel.configuration;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import pl.alyx.api.excel.filter.StaticTokenAuthenticationFilter;
import pl.alyx.api.excel.utility.JwtUtil;

@Configuration
public class SecurityConfiguration {

    @Bean
    public JwtUtil jwtUtil(AccessConfiguration accessConfiguration) {
        return new JwtUtil(accessConfiguration.getJwt().getSecret());
    }

    @Bean
    public StaticTokenAuthenticationFilter staticTokenAuthenticationFilter(AccessConfiguration accessConfiguration) {
        return new StaticTokenAuthenticationFilter(accessConfiguration);
    }
}
