package com.workload.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Convert;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "users")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class User {

  @Id private UUID id;

  @Column(nullable = false, unique = true)
  private String email;

  @Column(nullable = false)
  private String name;

  @Column(name = "password_hash", nullable = false)
  private String passwordHash;

  @Convert(converter = RoleConverter.class)
  @Column(nullable = false, length = 20)
  private Role role;

  @Column(name = "division_id")
  private UUID divisionId;

  @Column(name = "home_division_id")
  private UUID homeDivisionId;

  @Column(name = "capacity_fte", nullable = false, precision = 4, scale = 2)
  private BigDecimal capacityFte;

  @Column(name = "employee_id", length = 100)
  private String employeeId;

  @Column(name = "is_active", nullable = false)
  private boolean active;

  @Column(name = "requires_activation", nullable = false)
  private boolean requiresActivation;

  @Column(name = "created_at", nullable = false)
  private OffsetDateTime createdAt;

  @Column(name = "updated_at", nullable = false)
  private OffsetDateTime updatedAt;
}
