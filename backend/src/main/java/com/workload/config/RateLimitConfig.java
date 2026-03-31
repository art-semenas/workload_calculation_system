package com.workload.config;

import io.github.bucket4j.Bandwidth;
import java.time.Duration;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class RateLimitConfig {

  @Bean
  Bandwidth defaultRateLimitBandwidth(@Value("${rate-limit.capacity:100}") long capacity) {
    return Bandwidth.builder()
        .capacity(capacity)
        .refillGreedy(capacity, Duration.ofMinutes(1))
        .build();
  }
}
