package com.workload;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
class WorkloadApplicationTest {

  @Test
  void contextLoads() {
    // Passes if Spring context starts successfully.
    // Testcontainers JDBC URL in application-test.yml spins up a real PostgreSQL 15
    // container and runs all Liquibase migrations automatically.
    // Failure here means: bad bean wiring, missing config key, or broken migration.
  }
}
