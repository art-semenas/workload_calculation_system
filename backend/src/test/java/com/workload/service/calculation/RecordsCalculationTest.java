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
    config.setRepairProductiveMonths(5);
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
    config.setRecordsFootageMinutes(180);
    config.setRecordsBackupMinutes(120);
    config.setRecordsAdminMinutes(60);
    config.setMonthlyHoursFund(new BigDecimal("142.8"));
    config.setAbsenceCoefficient(new BigDecimal("1.12"));
  }

  @Test
  void allFiveTaskTypes() {
    // access=2, monitoring=1, footage=3, backup=1, admin=4
    // records_6months = 2×60 + 1×180 + 3×180 + 1×120 + 4×60
    //                 = 120 + 180 + 540 + 120 + 240 = 1200
    // records_monthly = 1200 / 6 = 200
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
        .isEqualByComparingTo(new BigDecimal("200"));
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

    assertThat(result)
        .usingComparator(BigDecimal::compareTo)
        .isEqualByComparingTo(BigDecimal.ZERO);
  }

  @Test
  void singleTaskType() {
    // access=5, rest=0
    // records_6months = 5×60 = 300
    // records_monthly = 300 / 6 = 50
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
        .isEqualByComparingTo(new BigDecimal("50"));
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

    // With normative=30: records_6months = 5×30 = 150; records_monthly = 150/6 = 25
    assertThat(result)
        .usingComparator(BigDecimal::compareTo)
        .isEqualByComparingTo(new BigDecimal("25"));
  }

  @Test
  void nullRecords_returnsZero() {
    BigDecimal result = helper.calculateMonthly(null, config);

    assertThat(result)
        .usingComparator(BigDecimal::compareTo)
        .isEqualByComparingTo(BigDecimal.ZERO);
  }
}
