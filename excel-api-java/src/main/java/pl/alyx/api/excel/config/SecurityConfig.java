package pl.alyx.api.excel.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import pl.alyx.api.excel.security.JwtUtil;

@Configuration
public class SecurityConfig {

    @Bean
    public JwtUtil jwtUtil(AccessConfig accessConfig) {
        return new JwtUtil(accessConfig.getJwt().getSecret());
    }
}
