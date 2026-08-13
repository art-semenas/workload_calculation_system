package com.workload.config;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.TestPropertySource;

@SpringBootTest(
    webEnvironment = SpringBootTest.WebEnvironment.NONE,
    // Load only WorkloadConfig — avoids DataSource/JPA auto-config entirely
    classes = {WorkloadConfigTest.TestConfig.class})
@TestPropertySource(
    properties = {
      "workload.config.planning-period-months=6",
      "workload.config.productive-months=5",
      "workload.config.repair-travel-zero-threshold=5",
      "workload.config.repair-travel-cap=10",
      "workload.config.pzv-minutes=20",
      "workload.config.engineer-warning-threshold=0.9",
      "workload.config.os-r1-visits-per-year=10",
      "workload.config.os-r2-visits-per-year=2",
      "workload.config.ps-r1-visits-per-year=8",
      "workload.config.ps-r2-visits-per-year=4",
      "workload.config.video-r1-visits-per-year=10",
      "workload.config.video-r2-visits-per-year=2",
      "workload.config.records-access-minutes=60",
      "workload.config.records-monitoring-minutes=180",
      "workload.config.records-footage-minutes=20",
      "workload.config.records-backup-minutes=3.15",
      "workload.config.records-admin-minutes=60",
      "workload.config.monthly-hours-fund=142.8",
      "workload.config.absence-coefficient=1.12",
      "workload.config.engineer-overload-threshold=1.0"
    })
class WorkloadConfigTest {

  @EnableConfigurationProperties(WorkloadConfig.class)
  static class TestConfig {}

  @Autowired WorkloadConfig config;

  @Test
  void allKeysAreBound() {
    assertThat(config.getPlanningPeriodMonths()).isEqualTo(6);
    assertThat(config.getProductiveMonths()).isEqualTo(5);
    assertThat(config.getRepairTravelZeroThreshold()).isEqualTo(5);
    assertThat(config.getRepairTravelCap()).isEqualTo(10);
    assertThat(config.getPzvMinutes()).isEqualTo(20);
    assertThat(config.getEngineerWarningThreshold()).isEqualByComparingTo(new BigDecimal("0.9"));
    assertThat(config.getOsR1VisitsPerYear()).isEqualTo(10);
    assertThat(config.getOsR2VisitsPerYear()).isEqualTo(2);
    assertThat(config.getPsR1VisitsPerYear()).isEqualTo(8);
    assertThat(config.getPsR2VisitsPerYear()).isEqualTo(4);
    assertThat(config.getVideoR1VisitsPerYear()).isEqualTo(10);
    assertThat(config.getVideoR2VisitsPerYear()).isEqualTo(2);
    assertThat(config.getRecordsAccessMinutes()).isEqualTo(60);
    assertThat(config.getRecordsMonitoringMinutes()).isEqualTo(180);
    assertThat(config.getRecordsFootageMinutes()).isEqualTo(20);
    assertThat(config.getRecordsBackupMinutes()).isEqualByComparingTo(new BigDecimal("3.15"));
    assertThat(config.getRecordsAdminMinutes()).isEqualTo(60);
    assertThat(config.getMonthlyHoursFund()).isEqualByComparingTo(new BigDecimal("142.8"));
    assertThat(config.getAbsenceCoefficient()).isEqualByComparingTo(new BigDecimal("1.12"));
    assertThat(config.getEngineerOverloadThreshold()).isEqualByComparingTo(BigDecimal.ONE);
  }
}
