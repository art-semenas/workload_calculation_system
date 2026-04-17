package com.workload.service.calculation;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.within;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

import com.workload.config.WorkloadConfig;
import com.workload.entity.DeviceSystemContext;
import com.workload.entity.ObjectRepair;
import com.workload.entity.ObjectSystemAssignment;
import com.workload.entity.RecordsTask;
import com.workload.entity.RepairType;
import com.workload.entity.Summary;
import com.workload.entity.SystemType;
import com.workload.entity.Travel;
import com.workload.repository.ObjectRepairRepository;
import com.workload.repository.ObjectSystemAssignmentRepository;
import com.workload.repository.RecordsTaskRepository;
import com.workload.repository.SummaryRepository;
import com.workload.repository.TravelRepository;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class CalculationServiceTest {

  @Mock private ObjectSystemAssignmentRepository assignmentRepo;
  @Mock private RecordsTaskRepository recordsRepo;
  @Mock private ObjectRepairRepository repairRepo;
  @Mock private TravelRepository travelRepo;
  @Mock private SummaryRepository summaryRepo;

  private WorkloadConfig config;
  private RepairCalculationHelper repairHelper;
  private RecordsCalculationHelper recordsHelper;
  private CalculationService calculationService;

  private final UUID objectId = UUID.fromString("00000000-0000-0000-0000-000000000001");

  @BeforeEach
  void setUp() {
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

    repairHelper = new RepairCalculationHelper();
    recordsHelper = new RecordsCalculationHelper();

    calculationService =
        new CalculationService(
            assignmentRepo,
            recordsRepo,
            repairRepo,
            travelRepo,
            summaryRepo,
            config,
            repairHelper,
            recordsHelper);
  }

  // --- PAC-01 reference test data setup helpers ---

  /**
   * Builds the OS assignment for PAC-01. Single device: qty=1, R1=48.81996, R2=0 → os_monthly_avg =
   * (48.81996×10 + 0×2) / 12 = 40.6833
   */
  private ObjectSystemAssignment buildOsAssignment() {
    DeviceSystemContext ctx =
        DeviceSystemContext.builder()
            .id(UUID.randomUUID())
            .systemType(SystemType.OS)
            .r1Minutes(new BigDecimal("48.81996"))
            .r2Minutes(BigDecimal.ZERO)
            .build();
    return ObjectSystemAssignment.builder()
        .id(UUID.randomUUID())
        .systemType(SystemType.OS)
        .quantityMaintained(BigDecimal.ONE)
        .context(ctx)
        .build();
  }

  /**
   * Builds the PS assignment for PAC-01. Single device: qty=1, R1=45.6255, R2=0 → ps_monthly_avg =
   * (45.6255×8 + 0×4) / 12 = 30.417
   */
  private ObjectSystemAssignment buildPsAssignment() {
    DeviceSystemContext ctx =
        DeviceSystemContext.builder()
            .id(UUID.randomUUID())
            .systemType(SystemType.PS)
            .r1Minutes(new BigDecimal("45.6255"))
            .r2Minutes(BigDecimal.ZERO)
            .build();
    return ObjectSystemAssignment.builder()
        .id(UUID.randomUUID())
        .systemType(SystemType.PS)
        .quantityMaintained(BigDecimal.ONE)
        .context(ctx)
        .build();
  }

  /**
   * Builds 8 repair records for PAC-01. kvo=8, repairWork6months=361: 7 repairs × 50min + 1 repair
   * × 11min = 361 → repairNoTravelMonthly = 361/5 = 72.2 → effectiveTrips=8 (5 < 8 <= 10);
   * travel=8×20=160; pzv=8×20=160 → repairWithTravelMonthly = (361+160+160)/5 = 136.2
   */
  private List<ObjectRepair> buildPac01Repairs() {
    List<ObjectRepair> repairs = new ArrayList<>();
    for (int i = 0; i < 7; i++) {
      RepairType rt =
          RepairType.builder()
              .id(UUID.randomUUID())
              .name("RepairType" + i)
              .timeMinutes(new BigDecimal("50"))
              .build();
      repairs.add(ObjectRepair.builder().id(UUID.randomUUID()).repairType(rt).count(1).build());
    }
    // 8th repair: 11 minutes → total = 7×50 + 11 = 361
    RepairType rt7 =
        RepairType.builder()
            .id(UUID.randomUUID())
            .name("RepairType7")
            .timeMinutes(new BigDecimal("11"))
            .build();
    repairs.add(ObjectRepair.builder().id(UUID.randomUUID()).repairType(rt7).count(1).build());
    return repairs;
  }

  private Travel buildTravel() {
    return Travel.builder().id(UUID.randomUUID()).oneWayTimeMin(new BigDecimal("10")).build();
  }

  private void stubPac01Mocks() {
    when(assignmentRepo.findAllByObjectId(objectId))
        .thenReturn(List.of(buildOsAssignment(), buildPsAssignment()));
    when(recordsRepo.findByObjectId(objectId)).thenReturn(Optional.empty());
    when(repairRepo.findAllByObjectId(objectId)).thenReturn(buildPac01Repairs());
    when(travelRepo.findByObjectId(objectId)).thenReturn(Optional.of(buildTravel()));
    when(summaryRepo.findByObjectId(objectId)).thenReturn(Optional.empty());
    when(summaryRepo.save(any(Summary.class))).thenAnswer(inv -> inv.getArgument(0));
  }

  // --- PAC-01 tests ---

  @Test
  void pac01_referenceObject_itogoWithTravel() {
    stubPac01Mocks();

    Summary result = calculationService.recalculate(objectId);

    // total_with_travel ≈ 247.3; itogo = 247.3 / (60 × 142.8 / 1.12) = 247.3 / 7650 ≈ 0.032327
    assertThat(result.getItogoChisloWithTravel())
        .usingComparator(BigDecimal::compareTo)
        .isBetween(new BigDecimal("0.032326"), new BigDecimal("0.032328"));
  }

  @Test
  void pac01_referenceObject_itogoNoTravel() {
    stubPac01Mocks();

    Summary result = calculationService.recalculate(objectId);

    // total_no_travel ≈ 183.3; itogo = 183.3 / 7650 ≈ 0.023961
    assertThat(result.getItogoChisloNoTravel())
        .usingComparator(BigDecimal::compareTo)
        .isBetween(new BigDecimal("0.023960"), new BigDecimal("0.023962"));
  }

  @Test
  void pac01_referenceObject_osMonthlyAvg() {
    stubPac01Mocks();

    Summary result = calculationService.recalculate(objectId);

    // os_monthly_avg = (48.81996×10 + 0×2) / 12 ≈ 40.683
    assertThat(result.getOsMonthlyAvg())
        .usingComparator(BigDecimal::compareTo)
        .isBetween(new BigDecimal("40.67"), new BigDecimal("40.70"));
  }

  @Test
  void pac01_referenceObject_psMonthlyAvg() {
    stubPac01Mocks();

    Summary result = calculationService.recalculate(objectId);

    // ps_monthly_avg = (45.6255×8 + 0×4) / 12 ≈ 30.417
    assertThat(result.getPsMonthlyAvg())
        .usingComparator(BigDecimal::compareTo)
        .isBetween(new BigDecimal("30.41"), new BigDecimal("30.42"));
  }

  // --- Zero-guard tests (C-39) ---

  @Test
  void zeroGuardTest_allComponentsZero() {
    // No assignments, no records, no repairs, no travel
    when(assignmentRepo.findAllByObjectId(objectId)).thenReturn(List.of());
    when(recordsRepo.findByObjectId(objectId)).thenReturn(Optional.empty());
    when(repairRepo.findAllByObjectId(objectId)).thenReturn(List.of());
    when(travelRepo.findByObjectId(objectId)).thenReturn(Optional.empty());
    when(summaryRepo.findByObjectId(objectId)).thenReturn(Optional.empty());
    when(summaryRepo.save(any(Summary.class))).thenAnswer(inv -> inv.getArgument(0));

    Summary result = calculationService.recalculate(objectId);

    assertThat(result.getItogoChisloWithTravel())
        .usingComparator(BigDecimal::compareTo)
        .isEqualByComparingTo(BigDecimal.ZERO);
  }

  @Test
  void zeroGuardTest_onlyPzvAndTravel() {
    // Object has travel (PZV + round-trip would be non-zero) but no work components at all.
    // According to C-39: if all work components are zero, itogo_chislo = 0.
    // PZV and travel alone must NOT produce a phantom FTE.
    when(assignmentRepo.findAllByObjectId(objectId)).thenReturn(List.of());
    when(recordsRepo.findByObjectId(objectId)).thenReturn(Optional.empty());
    when(repairRepo.findAllByObjectId(objectId)).thenReturn(List.of());
    when(travelRepo.findByObjectId(objectId)).thenReturn(Optional.of(buildTravel()));
    when(summaryRepo.findByObjectId(objectId)).thenReturn(Optional.empty());
    when(summaryRepo.save(any(Summary.class))).thenAnswer(inv -> inv.getArgument(0));

    Summary result = calculationService.recalculate(objectId);

    assertThat(result.getItogoChisloWithTravel())
        .usingComparator(BigDecimal::compareTo)
        .isEqualByComparingTo(BigDecimal.ZERO);
    assertThat(result.getItogoChisloNoTravel())
        .usingComparator(BigDecimal::compareTo)
        .isEqualByComparingTo(BigDecimal.ZERO);
  }

  // --- Records-only test ---

  @Test
  void recordsOnlyTest() {
    // Records: access=2, all others=0
    // records_6months = 2×60 = 120; records_monthly = 120/6 = 20
    RecordsTask records =
        RecordsTask.builder()
            .id(UUID.randomUUID())
            .accessRequests(new BigDecimal("2"))
            .monitoringRequests(BigDecimal.ZERO)
            .footageRequests(BigDecimal.ZERO)
            .backupControl(BigDecimal.ZERO)
            .securityAdmin(BigDecimal.ZERO)
            .build();
    when(assignmentRepo.findAllByObjectId(objectId)).thenReturn(List.of());
    when(recordsRepo.findByObjectId(objectId)).thenReturn(Optional.of(records));
    when(repairRepo.findAllByObjectId(objectId)).thenReturn(List.of());
    when(travelRepo.findByObjectId(objectId)).thenReturn(Optional.empty());
    when(summaryRepo.findByObjectId(objectId)).thenReturn(Optional.empty());
    when(summaryRepo.save(any(Summary.class))).thenAnswer(inv -> inv.getArgument(0));

    Summary result = calculationService.recalculate(objectId);

    // records_monthly = (2×60) / 6 = 20
    assertThat(result.getRecordsMonthly())
        .usingComparator(BigDecimal::compareTo)
        .isEqualByComparingTo(new BigDecimal("20"));
    // With only records work, itogo should be > 0
    assertThat(result.getItogoChisloWithTravel())
        .usingComparator(BigDecimal::compareTo)
        .isGreaterThan(BigDecimal.ZERO);
  }

  // --- Single OS device test ---

  @Test
  void osSystemOnly_singleDevice() {
    // Single OS device: qty=1, R1=10, R2=0
    // r1_contrib per visit = 1×10 = 10
    DeviceSystemContext ctx =
        DeviceSystemContext.builder()
            .id(UUID.randomUUID())
            .systemType(SystemType.OS)
            .r1Minutes(new BigDecimal("10"))
            .r2Minutes(BigDecimal.ZERO)
            .build();
    ObjectSystemAssignment assignment =
        ObjectSystemAssignment.builder()
            .id(UUID.randomUUID())
            .systemType(SystemType.OS)
            .quantityMaintained(BigDecimal.ONE)
            .context(ctx)
            .build();

    when(assignmentRepo.findAllByObjectId(objectId)).thenReturn(List.of(assignment));
    when(recordsRepo.findByObjectId(objectId)).thenReturn(Optional.empty());
    when(repairRepo.findAllByObjectId(objectId)).thenReturn(List.of());
    when(travelRepo.findByObjectId(objectId)).thenReturn(Optional.empty());
    when(summaryRepo.findByObjectId(objectId)).thenReturn(Optional.empty());
    when(summaryRepo.save(any(Summary.class))).thenAnswer(inv -> inv.getArgument(0));

    Summary result = calculationService.recalculate(objectId);

    // os_r1_per_visit = quantityMaintained × r1Minutes = 1 × 10 = 10
    assertThat(result.getOsR1PerVisit())
        .usingComparator(BigDecimal::compareTo)
        .isEqualByComparingTo(new BigDecimal("10"));
    // os_monthly_avg = (10×10 + 0×2) / 12 = 100/12 ≈ 8.3333
    assertThat(result.getOsMonthlyAvg())
        .usingComparator(BigDecimal::compareTo)
        .isBetween(new BigDecimal("8.33"), new BigDecimal("8.34"));
  }

  // --- Multi-system same-device test (OS and PS, R1 and R2 additive) ---

  @Test
  void multiSystem_sameDeviceBothOsAndPs() {
    // One device in OS, same device also in PS (separate assignments)
    // OS: qty=2, R1=5, R2=8
    DeviceSystemContext osCtx =
        DeviceSystemContext.builder()
            .id(UUID.randomUUID())
            .systemType(SystemType.OS)
            .r1Minutes(new BigDecimal("5"))
            .r2Minutes(new BigDecimal("8"))
            .build();
    ObjectSystemAssignment osAssignment =
        ObjectSystemAssignment.builder()
            .id(UUID.randomUUID())
            .systemType(SystemType.OS)
            .quantityMaintained(new BigDecimal("2"))
            .context(osCtx)
            .build();

    // PS: qty=1, R1=3, R2=6
    DeviceSystemContext psCtx =
        DeviceSystemContext.builder()
            .id(UUID.randomUUID())
            .systemType(SystemType.PS)
            .r1Minutes(new BigDecimal("3"))
            .r2Minutes(new BigDecimal("6"))
            .build();
    ObjectSystemAssignment psAssignment =
        ObjectSystemAssignment.builder()
            .id(UUID.randomUUID())
            .systemType(SystemType.PS)
            .quantityMaintained(BigDecimal.ONE)
            .context(psCtx)
            .build();

    when(assignmentRepo.findAllByObjectId(objectId))
        .thenReturn(List.of(osAssignment, psAssignment));
    when(recordsRepo.findByObjectId(objectId)).thenReturn(Optional.empty());
    when(repairRepo.findAllByObjectId(objectId)).thenReturn(List.of());
    when(travelRepo.findByObjectId(objectId)).thenReturn(Optional.empty());
    when(summaryRepo.findByObjectId(objectId)).thenReturn(Optional.empty());
    when(summaryRepo.save(any(Summary.class))).thenAnswer(inv -> inv.getArgument(0));

    Summary result = calculationService.recalculate(objectId);

    // OS: r1_per_visit = 2×5=10, r2_per_visit = 2×8=16
    // os_monthly = (10×10 + 16×2) / 12 = (100+32)/12 = 132/12 = 11
    assertThat(result.getOsR1PerVisit())
        .usingComparator(BigDecimal::compareTo)
        .isEqualByComparingTo(new BigDecimal("10"));
    assertThat(result.getOsR2PerVisit())
        .usingComparator(BigDecimal::compareTo)
        .isEqualByComparingTo(new BigDecimal("16"));
    assertThat(result.getOsMonthlyAvg())
        .usingComparator(BigDecimal::compareTo)
        .isEqualByComparingTo(new BigDecimal("11"));

    // PS: r1_per_visit = 1×3=3, r2_per_visit = 1×6=6
    // ps_monthly = (3×8 + 6×4) / 12 = (24+24)/12 = 48/12 = 4
    assertThat(result.getPsR1PerVisit())
        .usingComparator(BigDecimal::compareTo)
        .isEqualByComparingTo(new BigDecimal("3"));
    assertThat(result.getPsR2PerVisit())
        .usingComparator(BigDecimal::compareTo)
        .isEqualByComparingTo(new BigDecimal("6"));
    assertThat(result.getPsMonthlyAvg())
        .usingComparator(BigDecimal::compareTo)
        .isEqualByComparingTo(new BigDecimal("4"));

    // Both OS and PS contribute additively — itogo > 0
    assertThat(result.getItogoChisloWithTravel())
        .usingComparator(BigDecimal::compareTo)
        .isGreaterThan(BigDecimal.ZERO);
    // R2 does not replace R1 — os_monthly uses both R1 and R2 contributions
    assertThat(result.getOsMonthlyAvg())
        .usingComparator(BigDecimal::compareTo)
        .isGreaterThan(BigDecimal.ZERO);
  }

  // --- Multi-device same-system test ---

  @Test
  void multiDevice_sameSystem() {
    // Two OS devices — per-visit subtotals must be the SUM of both contributions
    DeviceSystemContext ctx1 =
        DeviceSystemContext.builder()
            .id(UUID.randomUUID())
            .systemType(SystemType.OS)
            .r1Minutes(new BigDecimal("4"))
            .r2Minutes(new BigDecimal("10"))
            .build();
    ObjectSystemAssignment a1 =
        ObjectSystemAssignment.builder()
            .id(UUID.randomUUID())
            .systemType(SystemType.OS)
            .quantityMaintained(new BigDecimal("3"))
            .context(ctx1)
            .build();

    DeviceSystemContext ctx2 =
        DeviceSystemContext.builder()
            .id(UUID.randomUUID())
            .systemType(SystemType.OS)
            .r1Minutes(new BigDecimal("2"))
            .r2Minutes(new BigDecimal("5"))
            .build();
    ObjectSystemAssignment a2 =
        ObjectSystemAssignment.builder()
            .id(UUID.randomUUID())
            .systemType(SystemType.OS)
            .quantityMaintained(new BigDecimal("2"))
            .context(ctx2)
            .build();

    when(assignmentRepo.findAllByObjectId(objectId)).thenReturn(List.of(a1, a2));
    when(recordsRepo.findByObjectId(objectId)).thenReturn(Optional.empty());
    when(repairRepo.findAllByObjectId(objectId)).thenReturn(List.of());
    when(travelRepo.findByObjectId(objectId)).thenReturn(Optional.empty());
    when(summaryRepo.findByObjectId(objectId)).thenReturn(Optional.empty());
    when(summaryRepo.save(any(Summary.class))).thenAnswer(inv -> inv.getArgument(0));

    Summary result = calculationService.recalculate(objectId);

    // Device 1: r1 = 3×4=12, r2 = 3×10=30
    // Device 2: r1 = 2×2=4,  r2 = 2×5=10
    // Total:    r1 = 16,      r2 = 40
    assertThat(result.getOsR1PerVisit())
        .usingComparator(BigDecimal::compareTo)
        .isEqualByComparingTo(new BigDecimal("16"));
    assertThat(result.getOsR2PerVisit())
        .usingComparator(BigDecimal::compareTo)
        .isEqualByComparingTo(new BigDecimal("40"));
    // os_monthly = (16×10 + 40×2) / 12 = (160+80)/12 = 240/12 = 20
    assertThat(result.getOsMonthlyAvg())
        .usingComparator(BigDecimal::compareTo)
        .isEqualByComparingTo(new BigDecimal("20"));
  }

  // --- Multi-device accumulation test using plan-table device data ---

  @Test
  void multiDevice_osAccumulation_fiveDevicesFromPlanTable() {
    // Five OS devices from plan table §3A — verifies per-device R1/R2 accumulation (Stages 1-3)
    // R1_per_visit = 2×5 + 2×1 + 12×0.06 + 2×0.02 + 21×0.7
    //              = 10 + 2 + 0.72 + 0.04 + 14.7 = 27.46
    // R2_per_visit = 2×8 + 2×4 + 12×0.7 + 2×1.5 + 21×3
    //              = 16 + 8 + 8.4 + 3 + 63 = 98.4
    // os_monthly_avg = (27.46×10 + 98.4×2) / 12 = 471.4 / 12 ≈ 39.2833
    List<ObjectSystemAssignment> assignments =
        List.of(
            buildOsAssignmentRaw(new BigDecimal("2"), new BigDecimal("5"), new BigDecimal("8")),
            buildOsAssignmentRaw(new BigDecimal("2"), new BigDecimal("1"), new BigDecimal("4")),
            buildOsAssignmentRaw(
                new BigDecimal("12"), new BigDecimal("0.06"), new BigDecimal("0.7")),
            buildOsAssignmentRaw(
                new BigDecimal("2"), new BigDecimal("0.02"), new BigDecimal("1.5")),
            buildOsAssignmentRaw(
                new BigDecimal("21"), new BigDecimal("0.7"), new BigDecimal("3")));

    when(assignmentRepo.findAllByObjectId(objectId)).thenReturn(assignments);
    when(recordsRepo.findByObjectId(objectId)).thenReturn(Optional.empty());
    when(repairRepo.findAllByObjectId(objectId)).thenReturn(List.of());
    when(travelRepo.findByObjectId(objectId)).thenReturn(Optional.empty());
    when(summaryRepo.findByObjectId(objectId)).thenReturn(Optional.empty());
    when(summaryRepo.save(any(Summary.class))).thenAnswer(inv -> inv.getArgument(0));

    Summary result = calculationService.recalculate(objectId);

    assertThat(result.getOsMonthlyAvg())
        .usingComparator(BigDecimal::compareTo)
        .isCloseTo(new BigDecimal("39.2833"), within(new BigDecimal("0.001")));
    assertThat(result.getPsMonthlyAvg())
        .usingComparator(BigDecimal::compareTo)
        .isEqualByComparingTo(BigDecimal.ZERO);
  }

  private ObjectSystemAssignment buildOsAssignmentRaw(
      BigDecimal qty, BigDecimal r1, BigDecimal r2) {
    DeviceSystemContext ctx =
        DeviceSystemContext.builder()
            .id(UUID.randomUUID())
            .systemType(SystemType.OS)
            .r1Minutes(r1)
            .r2Minutes(r2)
            .build();
    return ObjectSystemAssignment.builder()
        .id(UUID.randomUUID())
        .systemType(SystemType.OS)
        .quantityMaintained(qty)
        .context(ctx)
        .build();
  }
}
