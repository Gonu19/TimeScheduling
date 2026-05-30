package com.example.timescheduling.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;


import org.springframework.lang.NonNull;

import org.springframework.context.annotation.Bean;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.web.filter.CorsFilter;

@Configuration
public class WebConfig {

    @Value("${cors.allowed-origins:http://localhost:5173,http://localhost:3000}")
    @NonNull
    private String[] allowedOrigins = new String[]{};

    @Bean
    public CorsFilter corsFilter() {
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        CorsConfiguration config = new CorsConfiguration();
        
        // 1. 모든 오리진 허용 (Credentials를 true로 주려면 allowedOrigins를 명시해야 함)
        for (String origin : allowedOrigins) {
            config.addAllowedOrigin(origin);
        }
        
        // 2. 헤더 허용
        config.addAllowedHeader("*");
        
        // 3. OPTIONS, PATCH 등 모든 메서드 명시적 허용
        config.addAllowedMethod("OPTIONS");
        config.addAllowedMethod("GET");
        config.addAllowedMethod("POST");
        config.addAllowedMethod("PUT");
        config.addAllowedMethod("PATCH");
        config.addAllowedMethod("DELETE");
        
        // 4. 인증 정보 포함 허용
        config.setAllowCredentials(true);
        
        // 5. 모든 경로(/**)에 적용
        source.registerCorsConfiguration("/**", config);
        return new CorsFilter(source);
    }
}
