package com.workload;

import com.workload.config.WorkloadConfig;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;

@SpringBootApplication
@EnableConfigurationProperties(WorkloadConfig.class)
public class WorkloadApplication {
    public static void main(String[] args) {
        SpringApplication.run(WorkloadApplication.class, args);
    }
}
