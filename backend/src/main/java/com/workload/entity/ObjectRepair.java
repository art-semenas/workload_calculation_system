package com.workload.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.time.OffsetDateTime;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(
    name = "object_repairs",
    uniqueConstraints =
        @UniqueConstraint(
            name = "uq_or_object_repair",
            columnNames = {"object_id", "repair_type_id"}))
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ObjectRepair {

  @Id private UUID id;

  @ManyToOne(optional = false)
  @JoinColumn(name = "object_id", nullable = false)
  private ObjectEntity object;

  @ManyToOne(optional = false)
  @JoinColumn(name = "repair_type_id", nullable = false)
  private RepairType repairType;

  @Column(nullable = false)
  private Integer count;

  @Column(name = "updated_at", nullable = false)
  private OffsetDateTime updatedAt;
}
