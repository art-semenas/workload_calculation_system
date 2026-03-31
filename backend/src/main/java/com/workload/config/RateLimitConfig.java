package com.workload.config;

import io.github.bucket4j.Bandwidth;
import java.time.Duration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class RateLimitConfig {

    @Bean
    Bandwidth defaultRateLimitBandwidth() {
        return Bandwidth.builder()
                .capacity(100)
                .refillGreedy(100, Duration.ofMinutes(1))
                .build();
    }
}