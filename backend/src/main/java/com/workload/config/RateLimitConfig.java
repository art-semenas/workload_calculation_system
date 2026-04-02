package com.workload.config;

import io.github.bucket4j.Bandwidth;
import java.time.Duration;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class RateLimitConfig {

  @Bean
  Bandwidth unauthenticatedRateLimitBandwidth(
      @Value("${rate-limit.unauthenticated-capacity:100}") long capacity) {
    return Bandwidth.builder()
        .capacity(capacity)
        .refillGreedy(capacity, Duration.ofMinutes(1))
        .build();
  }

  @Bean
  Bandwidth authenticatedRateLimitBandwidth(
      @Value("${rate-limit.authenticated-capacity:300}") long capacity) {
    return Bandwidth.builder()
        .capacity(capacity)
        .refillGreedy(capacity, Duration.ofMinutes(1))
        .build();
  }
}
