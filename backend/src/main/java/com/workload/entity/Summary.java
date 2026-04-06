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

@Entity
@Table(name = "summaries")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Summary {

  @Id private UUID id;

  @OneToOne
  @JoinColumn(name = "object_id", nullable = false, unique = true)
  private ObjectEntity object;

  @Column(name = "os_r1_per_visit")
  private BigDecimal osR1PerVisit;

  @Column(name = "os_r2_per_visit")
  private BigDecimal osR2PerVisit;

  @Column(name = "ps_r1_per_visit")
  private BigDecimal psR1PerVisit;

  @Column(name = "ps_r2_per_visit")
  private BigDecimal psR2PerVisit;

  @Column(name = "video_r1_per_visit")
  private BigDecimal videoR1PerVisit;

  @Column(name = "video_r2_per_visit")
  private BigDecimal videoR2PerVisit;

  @Column(name = "r1_per_visit_total")
  private BigDecimal r1PerVisitTotal;

  @Column(name = "r2_per_visit_total")
  private BigDecimal r2PerVisitTotal;

  @Column(name = "os_monthly_avg")
  private BigDecimal osMonthlyAvg;

  @Column(name = "ps_monthly_avg")
  private BigDecimal psMonthlyAvg;

  @Column(name = "video_monthly_avg")
  private BigDecimal videoMonthlyAvg;

  @Column(name = "records_monthly")
  private BigDecimal recordsMonthly;

  @Column(name = "repair_no_travel_monthly")
  private BigDecimal repairNoTravelMonthly;

  @Column(name = "repair_with_travel_monthly")
  private BigDecimal repairWithTravelMonthly;

  @Column(name = "round_trip_min")
  private BigDecimal roundTripMin;

  @Column(name = "pzv_minutes")
  private BigDecimal pzvMinutes;

  @Column(name = "total_no_travel_min")
  private BigDecimal totalNoTravelMin;

  @Column(name = "itogo_chislo_no_travel")
  private BigDecimal itogoChisloNoTravel;

  @Column(name = "total_with_travel_min")
  private BigDecimal totalWithTravelMin;

  @Column(name = "itogo_chislo_with_travel")
  private BigDecimal itogoChisloWithTravel;

  @Column(name = "computed_at")
  private OffsetDateTime computedAt;
}
