package com.workload.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(
    name = "device_system_contexts",
    uniqueConstraints =
        @UniqueConstraint(
            name = "uq_dsc_device_system",
            columnNames = {"device_type_id", "system_type"}))
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DeviceSystemContext {

  @Id private UUID id;

  @ManyToOne(optional = false)
  @JoinColumn(name = "device_type_id", nullable = false)
  private DeviceType deviceType;

  @Enumerated(EnumType.STRING)
  @Column(name = "system_type", nullable = false, length = 10)
  private SystemType systemType;

  @Column(name = "r1_minutes", nullable = false, precision = 10, scale = 4)
  private BigDecimal r1Minutes;

  @Column(name = "r2_minutes", nullable = false, precision = 10, scale = 4)
  private BigDecimal r2Minutes;

  @Column(name = "created_at", nullable = false)
  private OffsetDateTime createdAt;

  @Column(name = "updated_at", nullable = false)
  private OffsetDateTime updatedAt;
}
