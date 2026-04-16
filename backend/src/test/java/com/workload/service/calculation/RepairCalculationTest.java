package com.workload.service.calculation;

import static org.assertj.core.api.Assertions.assertThat;

import com.workload.config.WorkloadConfig;
import com.workload.entity.ObjectRepair;
import com.workload.entity.RepairType;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class RepairCalculationTest {

  private RepairCalculationHelper helper;
  private WorkloadConfig config;

  // round_trip_min = 20, pzv_minutes = 20, repairProductiveMonths = 5
  private static final BigDecimal ROUND_TRIP_MIN = new BigDecimal("20");

  @BeforeEach
  void setUp() {
    helper = new RepairCalculationHelper();

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

  /**
   * Builds N ObjectRepair entities each with count=1 and timeMinutes=10.
   * Total repair_work_6months = N × 10.
   */
  private List<ObjectRepair> buildRepairs(int kvo) {
    List<ObjectRepair> repairs = new ArrayList<>();
    for (int i = 0; i < kvo; i++) {
      RepairType rt =
          RepairType.builder()
              .id(UUID.randomUUID())
              .name("RepairType" + i)
              .timeMinutes(new BigDecimal("10"))
              .build();
      repairs.add(
          ObjectRepair.builder()
              .id(UUID.randomUUID())
              .repairType(rt)
              .count(1)
              .build());
    }
    return repairs;
  }

  /**
   * Computes expected repair_no_travel_monthly for N repairs × timeMinutes=10, count=1.
   * repairWork6months = N × 10
   * repairNoTravelMonthly = repairWork6months / repairProductiveMonths
   */
  private BigDecimal expectedNoTravel(int kvo) {
    // repairWork6months = kvo × 10
    BigDecimal work = new BigDecimal(kvo * 10);
    // repairNoTravelMonthly = work / 5
    return work.divide(new BigDecimal("5"), 10, java.math.RoundingMode.HALF_UP);
  }

  /**
   * Computes expected repair_with_travel_monthly given effective_trips.
   * repairWork6months = kvo × 10
   * repairTravel6months = effective_trips × round_trip_min
   * repairPzv6months    = effective_trips × pzv_minutes
   * repairWithTravelMonthly = (work + travel + pzv) / repairProductiveMonths
   */
  private BigDecimal expectedWithTravel(int kvo, int effectiveTrips) {
    BigDecimal work = new BigDecimal(kvo * 10);
    BigDecimal travel = new BigDecimal(effectiveTrips).multiply(ROUND_TRIP_MIN);
    BigDecimal pzv = new BigDecimal(effectiveTrips).multiply(new BigDecimal("20"));
    return work.add(travel).add(pzv)
        .divide(new BigDecimal("5"), 10, java.math.RoundingMode.HALF_UP);
  }

  // --- Band A: kvo ≤ repairTravelZeroThreshold (5) → effectiveTrips = 0 ---

  @Test
  void kvo0_zeroTrips() {
    List<ObjectRepair> repairs = buildRepairs(0);
    RepairCalculationHelper.RepairResult result =
        helper.calculate(repairs, ROUND_TRIP_MIN, config);

    // effectiveTrips = 0; repairWork6months = 0
    assertThat(result.repairNoTravelMonthly())
        .usingComparator(BigDecimal::compareTo)
        .isEqualByComparingTo(BigDecimal.ZERO);
    assertThat(result.repairWithTravelMonthly())
        .usingComparator(BigDecimal::compareTo)
        .isEqualByComparingTo(BigDecimal.ZERO);
  }

  @Test
  void kvo3_zeroTrips() {
    List<ObjectRepair> repairs = buildRepairs(3);
    RepairCalculationHelper.RepairResult result =
        helper.calculate(repairs, ROUND_TRIP_MIN, config);

    // Band A: kvo=3 ≤ 5, effectiveTrips=0
    // repairNoTravel = (3×10)/5 = 6; repairWithTravel = (30+0+0)/5 = 6 (same, no travel)
    assertThat(result.repairNoTravelMonthly())
        .usingComparator(BigDecimal::compareTo)
        .isEqualByComparingTo(expectedNoTravel(3));
    assertThat(result.repairWithTravelMonthly())
        .usingComparator(BigDecimal::compareTo)
        .isEqualByComparingTo(expectedWithTravel(3, 0));
  }

  @Test
  void kvo5_exactlyAtThreshold_zeroTrips() {
    List<ObjectRepair> repairs = buildRepairs(5);
    RepairCalculationHelper.RepairResult result =
        helper.calculate(repairs, ROUND_TRIP_MIN, config);

    // Band A: kvo=5 is exactly at threshold → inclusive, effectiveTrips=0
    // repairNoTravel = (5×10)/5 = 10; repairWithTravel = 10 (no travel added)
    assertThat(result.repairNoTravelMonthly())
        .usingComparator(BigDecimal::compareTo)
        .isEqualByComparingTo(expectedNoTravel(5));
    assertThat(result.repairWithTravelMonthly())
        .usingComparator(BigDecimal::compareTo)
        .isEqualByComparingTo(expectedWithTravel(5, 0));
  }

  // --- Band B: repairTravelZeroThreshold < kvo ≤ repairTravelCap → effectiveTrips = kvo ---

  @Test
  void kvo6_entersBandB() {
    List<ObjectRepair> repairs = buildRepairs(6);
    RepairCalculationHelper.RepairResult result =
        helper.calculate(repairs, ROUND_TRIP_MIN, config);

    // Band B: kvo=6, 5 < 6 ≤ 10, effectiveTrips=6
    // repairTravel6months = 6×20=120; pzv = 6×20=120
    // repairWithTravel = (60+120+120)/5 = 300/5 = 60
    assertThat(result.repairNoTravelMonthly())
        .usingComparator(BigDecimal::compareTo)
        .isEqualByComparingTo(expectedNoTravel(6));
    assertThat(result.repairWithTravelMonthly())
        .usingComparator(BigDecimal::compareTo)
        .isEqualByComparingTo(expectedWithTravel(6, 6));
  }

  @Test
  void kvo8_bandB() {
    List<ObjectRepair> repairs = buildRepairs(8);
    RepairCalculationHelper.RepairResult result =
        helper.calculate(repairs, ROUND_TRIP_MIN, config);

    // Band B: kvo=8, effectiveTrips=8
    assertThat(result.repairNoTravelMonthly())
        .usingComparator(BigDecimal::compareTo)
        .isEqualByComparingTo(expectedNoTravel(8));
    assertThat(result.repairWithTravelMonthly())
        .usingComparator(BigDecimal::compareTo)
        .isEqualByComparingTo(expectedWithTravel(8, 8));
  }

  @Test
  void kvo10_exactlyAtCap() {
    List<ObjectRepair> repairs = buildRepairs(10);
    RepairCalculationHelper.RepairResult result =
        helper.calculate(repairs, ROUND_TRIP_MIN, config);

    // Band B: kvo=10 is exactly at cap → NOT capped, effectiveTrips=10
    assertThat(result.repairNoTravelMonthly())
        .usingComparator(BigDecimal::compareTo)
        .isEqualByComparingTo(expectedNoTravel(10));
    assertThat(result.repairWithTravelMonthly())
        .usingComparator(BigDecimal::compareTo)
        .isEqualByComparingTo(expectedWithTravel(10, 10));
  }

  // --- Band C: kvo > repairTravelCap → effectiveTrips = repairTravelCap (10) ---

  @Test
  void kvo11_cappedAtCap() {
    List<ObjectRepair> repairs = buildRepairs(11);
    RepairCalculationHelper.RepairResult result =
        helper.calculate(repairs, ROUND_TRIP_MIN, config);

    // Band C: kvo=11 > 10, effectiveTrips = cap = 10
    // repairNoTravel uses actual work (kvo=11 repairs), but travel is capped at 10 trips
    assertThat(result.repairNoTravelMonthly())
        .usingComparator(BigDecimal::compareTo)
        .isEqualByComparingTo(expectedNoTravel(11));
    assertThat(result.repairWithTravelMonthly())
        .usingComparator(BigDecimal::compareTo)
        .isEqualByComparingTo(expectedWithTravel(11, 10)); // capped at 10
  }

  @Test
  void kvo17_cappedAtCap() {
    List<ObjectRepair> repairs = buildRepairs(17);
    RepairCalculationHelper.RepairResult result =
        helper.calculate(repairs, ROUND_TRIP_MIN, config);

    // Band C: kvo=17 > 10, effectiveTrips = cap = 10
    assertThat(result.repairNoTravelMonthly())
        .usingComparator(BigDecimal::compareTo)
        .isEqualByComparingTo(expectedNoTravel(17));
    assertThat(result.repairWithTravelMonthly())
        .usingComparator(BigDecimal::compareTo)
        .isEqualByComparingTo(expectedWithTravel(17, 10)); // capped at 10
  }

  // --- kvo counts distinct types with count > 0, not sum of quantities ---

  @Test
  void kvoCountsDistinctTypes_notSumOfQuantities() {
    // 3 repair types: counts = [3, 5, 0]
    // kvo should be 2 (types with count > 0), NOT 8 (sum) and NOT 3 (total types)
    List<ObjectRepair> repairs = new ArrayList<>();

    RepairType rt1 = RepairType.builder().id(UUID.randomUUID()).name("RT1")
        .timeMinutes(new BigDecimal("10")).build();
    repairs.add(ObjectRepair.builder().id(UUID.randomUUID()).repairType(rt1).count(3).build());

    RepairType rt2 = RepairType.builder().id(UUID.randomUUID()).name("RT2")
        .timeMinutes(new BigDecimal("10")).build();
    repairs.add(ObjectRepair.builder().id(UUID.randomUUID()).repairType(rt2).count(5).build());

    RepairType rt3 = RepairType.builder().id(UUID.randomUUID()).name("RT3")
        .timeMinutes(new BigDecimal("10")).build();
    repairs.add(ObjectRepair.builder().id(UUID.randomUUID()).repairType(rt3).count(0).build());

    RepairCalculationHelper.RepairResult result =
        helper.calculate(repairs, ROUND_TRIP_MIN, config);

    // kvo = 2 (only RT1 and RT2 have count > 0)
    // kvo=2 ≤ threshold=5 → Band A, effectiveTrips=0
    // repairWork6months = 3×10 + 5×10 + 0×10 = 80
    // repairNoTravel = 80/5 = 16
    // repairWithTravel = 80/5 = 16 (no travel, no pzv)
    BigDecimal expectedWork = new BigDecimal("80").divide(new BigDecimal("5"), 10,
        java.math.RoundingMode.HALF_UP);
    assertThat(result.repairNoTravelMonthly())
        .usingComparator(BigDecimal::compareTo)
        .isEqualByComparingTo(expectedWork);
    assertThat(result.repairWithTravelMonthly())
        .usingComparator(BigDecimal::compareTo)
        .isEqualByComparingTo(expectedWork);
  }
}
