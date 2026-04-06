package com.workload.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
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
    name = "travel",
    uniqueConstraints =
        @UniqueConstraint(
            name = "uq_travel_object",
            columnNames = {"object_id"}))
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Travel {

  @Id private UUID id;

  @ManyToOne(optional = false)
  @JoinColumn(name = "object_id", nullable = false)
  private ObjectEntity object;

  @Column(name = "transport_type", length = 50)
  private String transportType;

  @Column(name = "distance_km", precision = 10, scale = 2)
  private BigDecimal distanceKm;

  @Column(name = "one_way_time_min", precision = 10, scale = 2)
  private BigDecimal oneWayTimeMin;

  @Column(name = "updated_at", nullable = false)
  private OffsetDateTime updatedAt;
}
