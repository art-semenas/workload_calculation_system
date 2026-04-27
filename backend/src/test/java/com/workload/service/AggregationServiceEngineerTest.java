package com.workload.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

import com.workload.config.WorkloadConfig;
import com.workload.dto.AggregationBranchDto;
import com.workload.dto.AggregationDivisionDto;
import com.workload.entity.Branch;
import com.workload.entity.Division;
import com.workload.entity.ObjectEntity;
import com.workload.entity.Summary;
import com.workload.repository.BranchRepository;
import com.workload.repository.DivisionRepository;
import com.workload.repository.EngineerSummaryRepository;
import com.workload.repository.SummaryRepository;
import com.workload.repository.UserRepository;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class AggregationServiceEngineerTest {

  @Mock private SummaryRepository summaryRepository;
  @Mock private DivisionRepository divisionRepository;
  @Mock private BranchRepository branchRepository;
  @Mock private UserRepository userRepository;
  @Mock private EngineerSummaryRepository engineerSummaryRepository;

  private WorkloadConfig config;
  private AggregationService aggregationService;

  @BeforeEach
  void setUp() {
    config = new WorkloadConfig();
    config.setPlanningPeriodMonths(6);
    config.setRepairProductiveMonths(6);
    config.setRepairTravelZeroThreshold(2);
    config.setRepairTravelCap(10);
    config.setPzvMinutes(15);
    config.setEngineerWarningThreshold(new BigDecimal("0.8"));
    config.setEngineerOverloadThreshold(new BigDecimal("1.0"));
    config.setOsR1VisitsPerYear(12);
    config.setOsR2VisitsPerYear(4);
    config.setPsR1VisitsPerYear(12);
    config.setPsR2VisitsPerYear(4);
    config.setVideoR1VisitsPerYear(12);
    config.setVideoR2VisitsPerYear(4);
    config.setRecordsAccessMinutes(30);
    config.setRecordsMonitoringMinutes(20);
    config.setRecordsFootageMinutes(15);
    config.setRecordsBackupMinutes(10);
    config.setRecordsAdminMinutes(5);
    config.setMonthlyHoursFund(new BigDecimal("160"));
    config.setAbsenceCoefficient(new BigDecimal("1.1"));

    aggregationService =
        new AggregationService(
            summaryRepository,
            divisionRepository,
            branchRepository,
            userRepository,
            engineerSummaryRepository,
            config);
  }

  private Division buildDivision(String name) {
    return Division.builder()
        .id(UUID.randomUUID())
        .name(name)
        .createdAt(OffsetDateTime.now())
        .updatedAt(OffsetDateTime.now())
        .build();
  }

  private Branch buildBranch(Division division, String name) {
    return Branch.builder()
        .id(UUID.randomUUID())
        .division(division)
        .name(name)
        .createdAt(OffsetDateTime.now())
        .updatedAt(OffsetDateTime.now())
        .build();
  }

  private ObjectEntity buildObject(Branch branch, String name) {
    return ObjectEntity.builder()
        .id(UUID.randomUUID())
        .branch(branch)
        .name(name)
        .createdAt(OffsetDateTime.now())
        .updatedAt(OffsetDateTime.now())
        .build();
  }

  private Summary buildSummary(ObjectEntity object, BigDecimal itogo) {
    return Summary.builder()
        .id(UUID.randomUUID())
        .object(object)
        .itogoChisloWithTravel(itogo)
        .osMonthlyAvg(new BigDecimal("60"))
        .psMonthlyAvg(new BigDecimal("120"))
        .videoMonthlyAvg(new BigDecimal("60"))
        .recordsMonthly(new BigDecimal("30"))
        .repairWithTravelMonthly(new BigDecimal("30"))
        .roundTripMin(new BigDecimal("60"))
        .pzvMinutes(new BigDecimal("30"))
        .totalWithTravelMin(new BigDecimal("300"))
        .computedAt(OffsetDateTime.now())
        .build();
  }

  @Test
  void divisionAggregation_includesEngineerCounts() {
    Division division = buildDivision("Division A");
    Branch branch = buildBranch(division, "Branch 1");
    ObjectEntity object = buildObject(branch, "Object 1");
    Summary summary = buildSummary(object, new BigDecimal("0.5"));

    UUID divId = division.getId();
    when(divisionRepository.findById(divId)).thenReturn(Optional.of(division));
    when(summaryRepository.findAllByDivisionIdWithOrgHierarchy(divId)).thenReturn(List.of(summary));
    when(userRepository.countByHomeDivisionIdAndActiveTrue(divId)).thenReturn(5L);
    when(engineerSummaryRepository.countByEngineerHomeDivisionIdAndStatus(divId, "overloaded"))
        .thenReturn(2L);
    when(engineerSummaryRepository.countByEngineerHomeDivisionIdAndStatus(divId, "warning"))
        .thenReturn(1L);

    AggregationDivisionDto result = aggregationService.getDivision(divId);

    assertThat(result.engineersTotal()).isEqualTo(5);
    assertThat(result.engineersOverloaded()).isEqualTo(2);
    assertThat(result.engineersWarning()).isEqualTo(1);
  }

  @Test
  void divisionAggregation_zeroEngineers_returnsZeroes() {
    Division division = buildDivision("Division B");
    Branch branch = buildBranch(division, "Branch 1");
    ObjectEntity object = buildObject(branch, "Object 1");
    Summary summary = buildSummary(object, new BigDecimal("0.2"));

    UUID divId = division.getId();
    when(divisionRepository.findById(divId)).thenReturn(Optional.of(division));
    when(summaryRepository.findAllByDivisionIdWithOrgHierarchy(divId)).thenReturn(List.of(summary));
    when(userRepository.countByHomeDivisionIdAndActiveTrue(divId)).thenReturn(0L);
    when(engineerSummaryRepository.countByEngineerHomeDivisionIdAndStatus(divId, "overloaded"))
        .thenReturn(0L);
    when(engineerSummaryRepository.countByEngineerHomeDivisionIdAndStatus(divId, "warning"))
        .thenReturn(0L);

    AggregationDivisionDto result = aggregationService.getDivision(divId);

    assertThat(result.engineersTotal()).isEqualTo(0);
    assertThat(result.engineersOverloaded()).isEqualTo(0);
    assertThat(result.engineersWarning()).isEqualTo(0);
  }

  @Test
  void branchAggregation_echosDivisionEngineerCounts() {
    Division division = buildDivision("Division A");
    Branch branch = buildBranch(division, "Branch 1");
    ObjectEntity object = buildObject(branch, "Object 1");
    Summary summary = buildSummary(object, new BigDecimal("0.3"));

    UUID divId = division.getId();
    UUID branchId = branch.getId();
    when(branchRepository.findById(branchId)).thenReturn(Optional.of(branch));
    when(summaryRepository.findAllByBranchIdWithOrgHierarchy(branchId))
        .thenReturn(List.of(summary));
    when(userRepository.countByHomeDivisionIdAndActiveTrue(divId)).thenReturn(4L);
    when(engineerSummaryRepository.countByEngineerHomeDivisionIdAndStatus(divId, "overloaded"))
        .thenReturn(3L);
    when(engineerSummaryRepository.countByEngineerHomeDivisionIdAndStatus(divId, "warning"))
        .thenReturn(1L);

    AggregationBranchDto result = aggregationService.getBranch(branchId);

    assertThat(result.engineersTotal()).isEqualTo(4);
    assertThat(result.engineersOverloaded()).isEqualTo(3);
    assertThat(result.engineersWarning()).isEqualTo(1);
  }
}
