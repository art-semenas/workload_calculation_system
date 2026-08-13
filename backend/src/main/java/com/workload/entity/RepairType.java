package com.workload.entity;

import jakarta.persistence.Column;
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
@Table(name = "repair_types")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RepairType {

  @Id private UUID id;

  @Column(nullable = false, unique = true)
  private String name;

  @Column(name = "time_minutes", nullable = false, precision = 10, scale = 4)
  private BigDecimal timeMinutes;

  /**
   * TRUE for the 9 paperwork types (акты). Their minutes count toward repair workload, but they are
   * excluded from К-во ремонтов, which drives the travel/PZV threshold. See TOR §4.5.
   */
  @Column(name = "is_document", nullable = false)
  private boolean isDocument;

  @Column(name = "created_at", nullable = false)
  private OffsetDateTime createdAt;

  @Column(name = "updated_at", nullable = false)
  private OffsetDateTime updatedAt;
}
