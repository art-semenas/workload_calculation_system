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

  /**
   * Job function, independent of {@link #role}, which is the permission tier. An engineer promoted
   * to editor or admin keeps this flag and so stays in {@code GET /engineers}, stays assignable,
   * and keeps their share of every object they are on. MVP M-02, v1.1.1.
   */
  @Column(name = "is_engineer", nullable = false)
  private boolean engineer;

  @Column(name = "requires_activation", nullable = false)
  private boolean requiresActivation;

  /** Consecutive failed login attempts; reset to 0 on success. MVP M-02, §21.3. */
  @Column(name = "failed_login_count", nullable = false)
  private int failedLoginCount;

  /** Set when the lockout threshold is reached; null means not locked. MVP M-02, §21.3. */
  @Column(name = "locked_until")
  private OffsetDateTime lockedUntil;

  @Column(name = "created_at", nullable = false)
  private OffsetDateTime createdAt;

  @Column(name = "updated_at", nullable = false)
  private OffsetDateTime updatedAt;
}
