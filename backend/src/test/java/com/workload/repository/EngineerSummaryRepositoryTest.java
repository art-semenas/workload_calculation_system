package com.workload.repository;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.workload.entity.EngineerSummary;
import com.workload.entity.Role;
import com.workload.entity.User;
import jakarta.persistence.EntityManager;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.test.context.ActiveProfiles;

@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@ActiveProfiles("test")
class EngineerSummaryRepositoryTest {

  @Autowired private EngineerSummaryRepository engineerSummaryRepository;
  @Autowired private UserRepository userRepository;
  @Autowired private EntityManager entityManager;

  @Test
  void findByEngineerId_returnsSummary() {
    User engineer = saveEngineer("eng-find@test.com", "Engineer Find");

    EngineerSummary summary =
        EngineerSummary.builder()
            .id(UUID.randomUUID())
            .engineer(engineer)
            .totalLoad(new BigDecimal("0.500000"))
            .objectCount(2)
            .computedAt(OffsetDateTime.now())
            .build();
    engineerSummaryRepository.saveAndFlush(summary);

    assertThat(engineerSummaryRepository.findByEngineerId(engineer.getId()))
        .isPresent()
        .hasValueSatisfying(
            s -> assertThat(s.getTotalLoad()).isEqualByComparingTo(new BigDecimal("0.500000")));
  }

  @Test
  void uniqueConstraintOnEngineerId() {
    User engineer = saveEngineer("eng-unique@test.com", "Engineer Unique Summary");

    EngineerSummary first =
        EngineerSummary.builder()
            .id(UUID.randomUUID())
            .engineer(engineer)
            .totalLoad(new BigDecimal("0.300000"))
            .computedAt(OffsetDateTime.now())
            .build();
    engineerSummaryRepository.saveAndFlush(first);

    EngineerSummary second =
        EngineerSummary.builder()
            .id(UUID.randomUUID())
            .engineer(engineer)
            .totalLoad(new BigDecimal("0.600000"))
            .computedAt(OffsetDateTime.now())
            .build();

    assertThatThrownBy(() -> engineerSummaryRepository.saveAndFlush(second))
        .isInstanceOf(DataIntegrityViolationException.class);
  }

  @Test
  void saveAndRetrieve_allFieldsPersist() {
    User engineer = saveEngineer("eng-allfields@test.com", "Engineer AllFields");
    OffsetDateTime now = OffsetDateTime.now();

    EngineerSummary summary =
        EngineerSummary.builder()
            .id(UUID.randomUUID())
            .engineer(engineer)
            .totalLoad(new BigDecimal("1.234567"))
            .objectCount(5)
            .osLoad(new BigDecimal("0.100000"))
            .psLoad(new BigDecimal("0.200000"))
            .videoLoad(new BigDecimal("0.300000"))
            .recordsLoad(new BigDecimal("0.400000"))
            .repairLoad(new BigDecimal("0.234567"))
            .capacityFte(new BigDecimal("1.00"))
            .loadRatio(new BigDecimal("1.234567"))
            .status("overloaded")
            .computedAt(now)
            .build();
    engineerSummaryRepository.saveAndFlush(summary);
    entityManager.clear();

    EngineerSummary retrieved =
        engineerSummaryRepository.findByEngineerId(engineer.getId()).orElseThrow();

    assertThat(retrieved.getTotalLoad()).isEqualByComparingTo(new BigDecimal("1.234567"));
    assertThat(retrieved.getObjectCount()).isEqualTo(5);
    assertThat(retrieved.getOsLoad()).isEqualByComparingTo(new BigDecimal("0.100000"));
    assertThat(retrieved.getPsLoad()).isEqualByComparingTo(new BigDecimal("0.200000"));
    assertThat(retrieved.getVideoLoad()).isEqualByComparingTo(new BigDecimal("0.300000"));
    assertThat(retrieved.getRecordsLoad()).isEqualByComparingTo(new BigDecimal("0.400000"));
    assertThat(retrieved.getRepairLoad()).isEqualByComparingTo(new BigDecimal("0.234567"));
    assertThat(retrieved.getCapacityFte()).isEqualByComparingTo(new BigDecimal("1.00"));
    assertThat(retrieved.getLoadRatio()).isEqualByComparingTo(new BigDecimal("1.234567"));
    assertThat(retrieved.getStatus()).isEqualTo("overloaded");
    assertThat(retrieved.getComputedAt()).isNotNull();
  }

  private User saveEngineer(String email, String name) {
    User engineer =
        User.builder()
            .id(UUID.randomUUID())
            .email(email)
            .name(name)
            .passwordHash("hash")
            .role(Role.ENGINEER)
            .capacityFte(new BigDecimal("1.00"))
            .active(true)
            .requiresActivation(false)
            .createdAt(OffsetDateTime.now())
            .updatedAt(OffsetDateTime.now())
            .build();
    return userRepository.saveAndFlush(engineer);
  }
}
