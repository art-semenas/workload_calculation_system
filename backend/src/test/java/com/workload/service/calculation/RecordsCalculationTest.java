package com.workload.service.calculation;

import static org.assertj.core.api.Assertions.assertThat;

import com.workload.config.WorkloadConfig;
import com.workload.entity.RecordsTask;
import java.math.BigDecimal;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class RecordsCalculationTest {

  private RecordsCalculationHelper helper;
  private WorkloadConfig config;

  @BeforeEach
  void setUp() {
    helper = new RecordsCalculationHelper();

    config = new WorkloadConfig();
    config.setPlanningPeriodMonths(6);
    config.setProductiveMonths(5);
    config.setRepairTravelZeroThreshold(5);
    config.setRepairTravelCap(10);
    config.setPzvMinutes(20);
    config.setEngineerWarningThreshold(new BigDecimal("0.9"));
    config.setEngineerOverloadThreshold(new BigDecimal("1.0"));
    config.setOsR1VisitsPerYear(10);
    config.setOsR2VisitsPerYear(2);
    config.setPsR1VisitsPerYear(8);
    config.setPsR2VisitsPerYear(4);
    config.setVideoR1VisitsPerYear(10);
    config.setVideoR2VisitsPerYear(2);
    config.setRecordsAccessMinutes(60);
    config.setRecordsMonitoringMinutes(180);
    config.setRecordsFootageMinutes(20);
    config.setRecordsBackupMinutes(new BigDecimal("3.15"));
    config.setRecordsAdminMinutes(60);
    config.setMonthlyHoursFund(new BigDecimal("142.8"));
    config.setAbsenceCoefficient(new BigDecimal("1.12"));
  }

  @Test
  void allFiveTaskTypes() {
    // access=2, monitoring=1, footage=3, backup=1, admin=4
    // records_6months = 2×60 + 1×180 + 3×20 + 1×3.15 + 4×60
    //                 = 120 + 180 + 60 + 3.15 + 240 = 603.15
    // records_monthly = 603.15 / 5 = 120.63
    RecordsTask records =
        RecordsTask.builder()
            .id(UUID.randomUUID())
            .accessRequests(new BigDecimal("2"))
            .monitoringRequests(new BigDecimal("1"))
            .footageRequests(new BigDecimal("3"))
            .backupControl(new BigDecimal("1"))
            .securityAdmin(new BigDecimal("4"))
            .build();

    BigDecimal result = helper.calculateMonthly(records, config);

    assertThat(result)
        .usingComparator(BigDecimal::compareTo)
        .isEqualByComparingTo(new BigDecimal("120.63"));
  }

  @Test
  void allZeros() {
    RecordsTask records =
        RecordsTask.builder()
            .id(UUID.randomUUID())
            .accessRequests(BigDecimal.ZERO)
            .monitoringRequests(BigDecimal.ZERO)
            .footageRequests(BigDecimal.ZERO)
            .backupControl(BigDecimal.ZERO)
            .securityAdmin(BigDecimal.ZERO)
            .build();

    BigDecimal result = helper.calculateMonthly(records, config);

    assertThat(result).usingComparator(BigDecimal::compareTo).isEqualByComparingTo(BigDecimal.ZERO);
  }

  @Test
  void singleTaskType() {
    // access=5, rest=0
    // records_6months = 5×60 = 300
    // records_monthly = 300 / 5 = 60
    RecordsTask records =
        RecordsTask.builder()
            .id(UUID.randomUUID())
            .accessRequests(new BigDecimal("5"))
            .monitoringRequests(BigDecimal.ZERO)
            .footageRequests(BigDecimal.ZERO)
            .backupControl(BigDecimal.ZERO)
            .securityAdmin(BigDecimal.ZERO)
            .build();

    BigDecimal result = helper.calculateMonthly(records, config);

    assertThat(result)
        .usingComparator(BigDecimal::compareTo)
        .isEqualByComparingTo(new BigDecimal("60"));
  }

  @Test
  void usesConfigNormatives() {
    // Verify that the helper reads normatives from config, not hardcoded values.
    // Override recordsAccessMinutes to 30 (was 60). Same records as singleTaskType.
    config.setRecordsAccessMinutes(30);

    RecordsTask records =
        RecordsTask.builder()
            .id(UUID.randomUUID())
            .accessRequests(new BigDecimal("5"))
            .monitoringRequests(BigDecimal.ZERO)
            .footageRequests(BigDecimal.ZERO)
            .backupControl(BigDecimal.ZERO)
            .securityAdmin(BigDecimal.ZERO)
            .build();

    BigDecimal result = helper.calculateMonthly(records, config);

    // With normative=30: records_6months = 5×30 = 150; records_monthly = 150/5 = 30
    assertThat(result)
        .usingComparator(BigDecimal::compareTo)
        .isEqualByComparingTo(new BigDecimal("30"));
  }

  @Test
  void nullRecords_returnsZero() {
    BigDecimal result = helper.calculateMonthly(null, config);

    assertThat(result).usingComparator(BigDecimal::compareTo).isEqualByComparingTo(BigDecimal.ZERO);
  }
}
