package com.workload.mapper;

import static org.assertj.core.api.Assertions.assertThat;

import com.workload.dto.EngineerCreateRequest;
import com.workload.dto.EngineerDto;
import com.workload.dto.EngineerSummaryDto;
import com.workload.entity.EngineerSummary;
import com.workload.entity.Role;
import com.workload.entity.User;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.mapstruct.factory.Mappers;

class EngineerMapperTest {

  private final EngineerMapper mapper = Mappers.getMapper(EngineerMapper.class);
  private final EngineerSummaryMapper summaryMapper =
      Mappers.getMapper(EngineerSummaryMapper.class);

  @Test
  void toDto_mapsAllFieldsCorrectly() {
    UUID userId = UUID.randomUUID();
    UUID homeDivisionId = UUID.randomUUID();
    OffsetDateTime createdAt = OffsetDateTime.now();

    User user =
        User.builder()
            .id(userId)
            .email("engineer@example.com")
            .name("Test Engineer")
            .passwordHash("hashed")
            .role(Role.ENGINEER)
            .homeDivisionId(homeDivisionId)
            .capacityFte(new BigDecimal("1.00"))
            .employeeId("EMP-001")
            .active(true)
            .requiresActivation(false)
            .createdAt(createdAt)
            .updatedAt(createdAt)
            .build();

    EngineerSummary summary =
        EngineerSummary.builder()
            .id(UUID.randomUUID())
            .engineer(null)
            .totalLoad(new BigDecimal("120.5"))
            .objectCount(3)
            .loadRatio(new BigDecimal("0.75"))
            .status("normal")
            .computedAt(createdAt)
            .build();

    EngineerDto dto = mapper.toDto(user, summary, "Test Division");

    assertThat(dto.id()).isEqualTo(userId);
    assertThat(dto.email()).isEqualTo("engineer@example.com");
    assertThat(dto.name()).isEqualTo("Test Engineer");
    assertThat(dto.role()).isEqualTo("engineer");
    assertThat(dto.homeDivisionId()).isEqualTo(homeDivisionId);
    assertThat(dto.homeDivisionName()).isEqualTo("Test Division");
    assertThat(dto.capacityFte()).isEqualByComparingTo("1.00");
    assertThat(dto.employeeId()).isEqualTo("EMP-001");
    assertThat(dto.isActive()).isTrue();
    assertThat(dto.objectCount()).isEqualTo(3);
    assertThat(dto.totalLoad()).isEqualByComparingTo("120.5");
    assertThat(dto.loadRatio()).isEqualByComparingTo("0.75");
    assertThat(dto.status()).isEqualTo("NORMAL");
    assertThat(dto.createdAt()).isEqualTo(createdAt);
  }

  @Test
  void toDto_nullSummary_summaryFieldsAreNull() {
    UUID userId = UUID.randomUUID();
    OffsetDateTime createdAt = OffsetDateTime.now();

    User user =
        User.builder()
            .id(userId)
            .email("engineer@example.com")
            .name("Test Engineer")
            .passwordHash("hashed")
            .role(Role.ENGINEER)
            .capacityFte(new BigDecimal("1.00"))
            .active(true)
            .requiresActivation(false)
            .createdAt(createdAt)
            .updatedAt(createdAt)
            .build();

    EngineerDto dto = mapper.toDto(user, null, "Some Division");

    assertThat(dto.objectCount()).isNull();
    assertThat(dto.totalLoad()).isNull();
    assertThat(dto.loadRatio()).isNull();
    assertThat(dto.status()).isNull();
  }

  @Test
  void toEntity_setsRoleEngineer() {
    EngineerCreateRequest request =
        new EngineerCreateRequest(
            "eng@example.com", "Jane Doe", "password123", new BigDecimal("1.00"), null, null);

    User entity = mapper.toEntity(request);

    assertThat(entity.getRole()).isEqualTo(Role.ENGINEER);
  }

  @Test
  void toEntity_setsActiveTrue() {
    EngineerCreateRequest request =
        new EngineerCreateRequest(
            "eng@example.com", "Jane Doe", "password123", new BigDecimal("1.00"), null, null);

    User entity = mapper.toEntity(request);

    assertThat(entity.isActive()).isTrue();
  }

  @Test
  void toEntity_setsRequiresActivationFalse() {
    EngineerCreateRequest request =
        new EngineerCreateRequest(
            "eng@example.com", "Jane Doe", "password123", new BigDecimal("1.00"), null, null);

    User entity = mapper.toEntity(request);

    assertThat(entity.isRequiresActivation()).isFalse();
  }

  @Test
  void toDto_statusUppercase() {
    UUID userId = UUID.randomUUID();
    OffsetDateTime createdAt = OffsetDateTime.now();

    User user =
        User.builder()
            .id(userId)
            .email("engineer@example.com")
            .name("Test Engineer")
            .passwordHash("hashed")
            .role(Role.ENGINEER)
            .capacityFte(new BigDecimal("1.00"))
            .active(true)
            .requiresActivation(false)
            .createdAt(createdAt)
            .updatedAt(createdAt)
            .build();

    EngineerSummary summary =
        EngineerSummary.builder()
            .id(UUID.randomUUID())
            .engineer(null)
            .totalLoad(new BigDecimal("100.0"))
            .objectCount(2)
            .loadRatio(new BigDecimal("0.50"))
            .status("warning")
            .computedAt(createdAt)
            .build();

    EngineerDto dto = mapper.toDto(user, summary, "Division Name");

    assertThat(dto.status()).isEqualTo("WARNING");
  }

  @Test
  void summaryMapper_toDto_statusUppercase() {
    UUID userId = UUID.randomUUID();
    OffsetDateTime createdAt = OffsetDateTime.now();

    User engineer =
        User.builder()
            .id(userId)
            .email("eng@example.com")
            .name("Eng Name")
            .passwordHash("hashed")
            .role(Role.ENGINEER)
            .capacityFte(new BigDecimal("1.00"))
            .active(true)
            .requiresActivation(false)
            .createdAt(createdAt)
            .updatedAt(createdAt)
            .build();

    EngineerSummary summary =
        EngineerSummary.builder()
            .id(UUID.randomUUID())
            .engineer(engineer)
            .totalLoad(new BigDecimal("200.0"))
            .objectCount(5)
            .osLoad(new BigDecimal("50.0"))
            .psLoad(new BigDecimal("30.0"))
            .videoLoad(new BigDecimal("20.0"))
            .recordsLoad(new BigDecimal("10.0"))
            .repairLoad(new BigDecimal("5.0"))
            .capacityFte(new BigDecimal("1.00"))
            .loadRatio(new BigDecimal("1.25"))
            .status("overloaded")
            .computedAt(createdAt)
            .build();

    EngineerSummaryDto dto = summaryMapper.toDto(summary);

    assertThat(dto.status()).isEqualTo("OVERLOADED");
    assertThat(dto.engineerId()).isEqualTo(userId);
  }
}
