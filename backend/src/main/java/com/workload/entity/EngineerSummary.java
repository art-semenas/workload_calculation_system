package com.workload.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;

@Entity
@Table(name = "engineer_summaries")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EngineerSummary {

  @Id private UUID id;

  @OneToOne
  @JoinColumn(name = "engineer_id", nullable = false, unique = true)
  @OnDelete(action = OnDeleteAction.CASCADE)
  private User engineer;

  @Column(name = "total_load", precision = 18, scale = 6)
  private BigDecimal totalLoad;

  @Column(name = "object_count")
  private Integer objectCount;

  @Column(name = "os_load", precision = 18, scale = 6)
  private BigDecimal osLoad;

  @Column(name = "ps_load", precision = 18, scale = 6)
  private BigDecimal psLoad;

  @Column(name = "video_load", precision = 18, scale = 6)
  private BigDecimal videoLoad;

  @Column(name = "records_load", precision = 18, scale = 6)
  private BigDecimal recordsLoad;

  @Column(name = "repair_load", precision = 18, scale = 6)
  private BigDecimal repairLoad;

  @Column(name = "capacity_fte", precision = 4, scale = 2)
  private BigDecimal capacityFte;

  @Column(name = "load_ratio", precision = 18, scale = 6)
  private BigDecimal loadRatio;

  @Column(name = "status", length = 20)
  private String status;

  @Column(name = "computed_at")
  private OffsetDateTime computedAt;
}
