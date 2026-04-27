package com.workload.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.workload.config.WorkloadConfig;
import com.workload.dto.AggregationBranchDto;
import com.workload.dto.AggregationCompanyDto;
import com.workload.dto.AggregationDivisionDto;
import com.workload.dto.CoverageGapDto;
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
class AggregationServiceTest {

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

  // -------------------------------------------------------------------------
  // Test data helpers
  // -------------------------------------------------------------------------

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

  // -------------------------------------------------------------------------
  // Test 1: company requiredFte == sum of all itogo values
  // -------------------------------------------------------------------------

  @Test
  void companyLoad_equalsSumOfDivisionLoads() {
    Division div1 = buildDivision("Division A");
    Division div2 = buildDivision("Division B");
    Branch b1 = buildBranch(div1, "Branch 1");
    Branch b2 = buildBranch(div2, "Branch 2");
    ObjectEntity o1 = buildObject(b1, "Object 1");
    ObjectEntity o2 = buildObject(b2, "Object 2");

    Summary s1 = buildSummary(o1, new BigDecimal("0.5"));
    Summary s2 = buildSummary(o2, new BigDecimal("0.3"));

    when(summaryRepository.findAllWithOrgHierarchy()).thenReturn(List.of(s1, s2));

    AggregationCompanyDto company = aggregationService.getCompany();

    assertThat(company.requiredFte()).isEqualByComparingTo(new BigDecimal("0.8"));
    assertThat(company.objectCount()).isEqualTo(2);
    assertThat(company.divisionCount()).isEqualTo(2);
  }

  // -------------------------------------------------------------------------
  // Test 2: division requiredFte == sum of object itogo values
  // -------------------------------------------------------------------------

  @Test
  void divisionLoad_equalsSumOfObjectLoads() {
    Division div = buildDivision("Division A");
    Branch branch = buildBranch(div, "Branch 1");
    ObjectEntity o1 = buildObject(branch, "Object 1");
    ObjectEntity o2 = buildObject(branch, "Object 2");
    ObjectEntity o3 = buildObject(branch, "Object 3");

    Summary s1 = buildSummary(o1, new BigDecimal("0.1"));
    Summary s2 = buildSummary(o2, new BigDecimal("0.2"));
    Summary s3 = buildSummary(o3, new BigDecimal("0.3"));

    when(summaryRepository.findAllByDivisionIdWithOrgHierarchy(div.getId()))
        .thenReturn(List.of(s1, s2, s3));
    when(divisionRepository.findById(div.getId())).thenReturn(Optional.of(div));
    when(userRepository.countByHomeDivisionIdAndActiveTrue(div.getId())).thenReturn(0L);
    when(engineerSummaryRepository.countByEngineerHomeDivisionIdAndStatus(
            div.getId(), "overloaded"))
        .thenReturn(0L);
    when(engineerSummaryRepository.countByEngineerHomeDivisionIdAndStatus(div.getId(), "warning"))
        .thenReturn(0L);

    AggregationDivisionDto result = aggregationService.getDivision(div.getId());

    assertThat(result.requiredFte()).isEqualByComparingTo(new BigDecimal("0.6"));
    assertThat(result.objectCount()).isEqualTo(3);
  }

  // -------------------------------------------------------------------------
  // Test 3: branch requiredFte == sum of object itogo values
  // -------------------------------------------------------------------------

  @Test
  void branchLoad_equalsSumOfObjectLoads() {
    Division div = buildDivision("Division A");
    Branch branch = buildBranch(div, "Branch 1");
    ObjectEntity o1 = buildObject(branch, "Object 1");
    ObjectEntity o2 = buildObject(branch, "Object 2");

    Summary s1 = buildSummary(o1, new BigDecimal("0.4"));
    Summary s2 = buildSummary(o2, new BigDecimal("0.6"));

    when(summaryRepository.findAllByBranchIdWithOrgHierarchy(branch.getId()))
        .thenReturn(List.of(s1, s2));
    when(branchRepository.findById(branch.getId())).thenReturn(Optional.of(branch));
    when(userRepository.countByHomeDivisionIdAndActiveTrue(div.getId())).thenReturn(0L);
    when(engineerSummaryRepository.countByEngineerHomeDivisionIdAndStatus(
            div.getId(), "overloaded"))
        .thenReturn(0L);
    when(engineerSummaryRepository.countByEngineerHomeDivisionIdAndStatus(div.getId(), "warning"))
        .thenReturn(0L);

    AggregationBranchDto result = aggregationService.getBranch(branch.getId());

    assertThat(result.requiredFte()).isEqualByComparingTo(new BigDecimal("1.0"));
    assertThat(result.objectCount()).isEqualTo(2);
  }

  // -------------------------------------------------------------------------
  // Test 4: component FTEs (os+ps+video+records+repair) < requiredFte
  //         (because requiredFte includes PZV + travel overhead)
  // -------------------------------------------------------------------------

  @Test
  void componentBreakdown_sumsToLessThanRequiredFte() {
    Division div = buildDivision("Division A");
    Branch branch = buildBranch(div, "Branch 1");
    ObjectEntity object = buildObject(branch, "Object 1");

    // Use a summary where itogoChisloWithTravel > sum of component FTEs
    Summary s =
        Summary.builder()
            .id(UUID.randomUUID())
            .object(object)
            .itogoChisloWithTravel(new BigDecimal("0.5"))
            .osMonthlyAvg(new BigDecimal("60"))
            .psMonthlyAvg(new BigDecimal("60"))
            .videoMonthlyAvg(new BigDecimal("60"))
            .recordsMonthly(new BigDecimal("60"))
            .repairWithTravelMonthly(new BigDecimal("60"))
            .roundTripMin(new BigDecimal("120"))
            .pzvMinutes(new BigDecimal("60"))
            .computedAt(OffsetDateTime.now())
            .build();

    when(summaryRepository.findAllWithOrgHierarchy()).thenReturn(List.of(s));

    AggregationCompanyDto company = aggregationService.getCompany();

    BigDecimal componentSum =
        company
            .breakdown()
            .os()
            .add(company.breakdown().ps())
            .add(company.breakdown().video())
            .add(company.breakdown().records())
            .add(company.breakdown().repair());

    // Component FTEs do not include PZV/travel overhead, so sum <= requiredFte
    assertThat(componentSum.compareTo(company.requiredFte())).isLessThanOrEqualTo(0);
  }

  // -------------------------------------------------------------------------
  // Test 5: staffingNeed rounds up to nearest tenth
  // -------------------------------------------------------------------------

  @Test
  void staffingNeed_roundsUpToNearestTenth() {
    Division div = buildDivision("Division A");
    Branch branch = buildBranch(div, "Branch 1");
    ObjectEntity object = buildObject(branch, "Object 1");

    Summary s = buildSummary(object, new BigDecimal("1.31"));
    when(summaryRepository.findAllWithOrgHierarchy()).thenReturn(List.of(s));

    AggregationCompanyDto company = aggregationService.getCompany();

    assertThat(company.requiredFte()).isEqualByComparingTo(new BigDecimal("1.31"));
    assertThat(company.staffingNeed()).isEqualByComparingTo(new BigDecimal("1.4"));
  }

  @Test
  void staffingNeed_exactTenth_noRoundingNeeded() {
    Division div = buildDivision("Division A");
    Branch branch = buildBranch(div, "Branch 1");
    ObjectEntity object = buildObject(branch, "Object 1");

    Summary s = buildSummary(object, new BigDecimal("1.30"));
    when(summaryRepository.findAllWithOrgHierarchy()).thenReturn(List.of(s));

    AggregationCompanyDto company = aggregationService.getCompany();

    assertThat(company.requiredFte()).isEqualByComparingTo(new BigDecimal("1.30"));
    assertThat(company.staffingNeed()).isEqualByComparingTo(new BigDecimal("1.3"));
  }

  // -------------------------------------------------------------------------
  // Test 6: coverageGaps returns all objects (PoC: no engineer assignments)
  // -------------------------------------------------------------------------

  @Test
  void coverageGaps_returnsAllObjects() {
    Division div = buildDivision("Division A");
    Branch branch = buildBranch(div, "Branch 1");
    ObjectEntity o1 = buildObject(branch, "Object 1");
    ObjectEntity o2 = buildObject(branch, "Object 2");
    ObjectEntity o3 = buildObject(branch, "Object 3");

    Summary s1 = buildSummary(o1, new BigDecimal("0.1"));
    Summary s2 = buildSummary(o2, new BigDecimal("0.2"));
    Summary s3 = buildSummary(o3, new BigDecimal("0.3"));

    when(summaryRepository.findAllWithOrgHierarchy()).thenReturn(List.of(s1, s2, s3));

    List<CoverageGapDto> gaps = aggregationService.getCoverageGaps(null);

    assertThat(gaps).hasSize(3);
  }

  // -------------------------------------------------------------------------
  // Test 7: coverageGaps filters by division
  // -------------------------------------------------------------------------

  @Test
  void coverageGaps_filtersByDivision() {
    Division div1 = buildDivision("Division A");
    Division div2 = buildDivision("Division B");
    Branch b1 = buildBranch(div1, "Branch 1");
    Branch b2 = buildBranch(div2, "Branch 2");
    ObjectEntity o1 = buildObject(b1, "Object 1");
    ObjectEntity o2 = buildObject(b2, "Object 2");

    Summary s1 = buildSummary(o1, new BigDecimal("0.1"));
    Summary s2 = buildSummary(o2, new BigDecimal("0.2"));

    when(summaryRepository.findAllByDivisionIdWithOrgHierarchy(div1.getId()))
        .thenReturn(List.of(s1));

    List<CoverageGapDto> gaps = aggregationService.getCoverageGaps(div1.getId());

    assertThat(gaps).hasSize(1);
    assertThat(gaps.get(0).objectId()).isEqualTo(o1.getId());
  }

  // -------------------------------------------------------------------------
  // Test 8: getBranches pre-computes division engineer counts once per division
  // -------------------------------------------------------------------------

  @Test
  void getBranches_sameDivision_engineerCountsLookedUpOncePerDivision() {
    Division div = buildDivision("Division A");
    Branch b1 = buildBranch(div, "Branch 1");
    Branch b2 = buildBranch(div, "Branch 2");
    ObjectEntity o1 = buildObject(b1, "Object 1");
    ObjectEntity o2 = buildObject(b2, "Object 2");

    Summary s1 = buildSummary(o1, new BigDecimal("0.2"));
    Summary s2 = buildSummary(o2, new BigDecimal("0.3"));

    when(summaryRepository.findAllWithOrgHierarchy()).thenReturn(List.of(s1, s2));
    when(userRepository.countByHomeDivisionIdAndActiveTrue(div.getId())).thenReturn(3L);
    when(engineerSummaryRepository.countByEngineerHomeDivisionIdAndStatus(
            div.getId(), "overloaded"))
        .thenReturn(1L);
    when(engineerSummaryRepository.countByEngineerHomeDivisionIdAndStatus(div.getId(), "warning"))
        .thenReturn(1L);

    List<AggregationBranchDto> result = aggregationService.getBranches();

    assertThat(result).hasSize(2);
    // Both branches belong to the same division — counts looked up exactly once
    verify(userRepository, times(1)).countByHomeDivisionIdAndActiveTrue(div.getId());
    verify(engineerSummaryRepository, times(1))
        .countByEngineerHomeDivisionIdAndStatus(div.getId(), "overloaded");
    verify(engineerSummaryRepository, times(1))
        .countByEngineerHomeDivisionIdAndStatus(div.getId(), "warning");
    // Each branch DTO still carries the correct division-level counts
    assertThat(result.get(0).engineersTotal()).isEqualTo(3);
    assertThat(result.get(1).engineersTotal()).isEqualTo(3);
  }
}
