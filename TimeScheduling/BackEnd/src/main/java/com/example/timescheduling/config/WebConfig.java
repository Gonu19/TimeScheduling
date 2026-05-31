package com.example.timescheduling.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import org.springframework.lang.NonNull;

@Configuration
public class WebConfig implements WebMvcConfigurer {

    // 환경 변수(cors.allowed-origins)에서 주입받거나, 기본값으로 로컬 프론트엔드 도메인 설정
    @Value("${cors.allowed-origins:http://localhost:5173,http://localhost:3000}")
    @NonNull
    private String[] allowedOrigins = new String[]{};

    @Override
    public void addCorsMappings(@NonNull CorsRegistry registry) {
        registry.addMapping("/**")
                .allowedOrigins(allowedOrigins)
                .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
                .allowedHeaders("*")
                .allowCredentials(true);
    }
}
