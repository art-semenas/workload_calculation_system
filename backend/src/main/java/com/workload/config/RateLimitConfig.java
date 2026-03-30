package com.workload.config;

import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import java.time.Duration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class RateLimitConfig {

    @Bean
    Bucket defaultRateLimitBucket() {
        Bandwidth limit = Bandwidth.builder().capacity(100).refillGreedy(100, Duration.ofMinutes(1)).build();
        return Bucket.builder().addLimit(limit).build();
    }
}