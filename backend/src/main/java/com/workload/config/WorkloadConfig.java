package com.workload.config;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

@ConfigurationProperties(prefix = "workload.config")
@Validated
@Getter
@Setter
public class WorkloadConfig {

  // §6.11 — Planning horizon
  @NotNull
  @Min(1)
  private Integer planningPeriodMonths;

  // Repair productive months (must be <= planningPeriodMonths — cross-key; MVP validation only)
  @NotNull
  @Min(1)
  private Integer repairProductiveMonths;

  // Repair travel threshold formula (§6.6)
  @NotNull
  @Min(0)
  private Integer repairTravelZeroThreshold;

  @NotNull
  @Min(1)
  private Integer repairTravelCap;

  // PZV (подготовительно-заключительное время) per trip, minutes
  @NotNull
  @Min(0)
  private Integer pzvMinutes;

  // Engineer status thresholds (§6.13)
  @NotNull
  @DecimalMin("0.0")
  @DecimalMax(value = "1.0", inclusive = false)
  private BigDecimal engineerWarningThreshold;

  @NotNull
  @DecimalMin("1.0")
  private BigDecimal engineerOverloadThreshold;

  // Visit frequencies per year by system type (§6.2)
  @NotNull
  @Min(1)
  private Integer osR1VisitsPerYear;

  @NotNull
  @Min(1)
  private Integer osR2VisitsPerYear;

  @NotNull
  @Min(1)
  private Integer psR1VisitsPerYear;

  @NotNull
  @Min(1)
  private Integer psR2VisitsPerYear;

  @NotNull
  @Min(1)
  private Integer videoR1VisitsPerYear;

  @NotNull
  @Min(1)
  private Integer videoR2VisitsPerYear;

  // Records task normatives, minutes (§6.5)
  @NotNull
  @Min(0)
  private Integer recordsAccessMinutes;

  @NotNull
  @Min(0)
  private Integer recordsMonitoringMinutes;

  @NotNull
  @Min(0)
  private Integer recordsFootageMinutes;

  @NotNull
  @Min(0)
  private Integer recordsBackupMinutes;

  @NotNull
  @Min(0)
  private Integer recordsAdminMinutes;

  // Working minutes per month — used for FTE conversion (§6.8)
  @NotNull
  @Min(1)
  private Integer minutesPerMonth;
}
