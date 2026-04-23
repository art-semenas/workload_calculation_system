package com.workload.service.calculation;

import com.workload.config.WorkloadConfig;
import com.workload.entity.ObjectRepair;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import org.springframework.stereotype.Component;

@Component
public class RepairCalculationHelper {

  public record RepairResult(
      BigDecimal repairNoTravelMonthly, BigDecimal repairWithTravelMonthly) {}

  public RepairResult calculate(
      List<ObjectRepair> repairs, BigDecimal roundTripMin, WorkloadConfig config) {

    // kvo = COUNT of distinct repair types with count > 0
    long kvo = repairs.stream().filter(r -> r.getCount() != null && r.getCount() > 0).count();

    // repairWork6months = SUM(repair.count × repairType.timeMinutes) for repairs with count > 0
    BigDecimal repairWork6months =
        repairs.stream()
            .filter(r -> r.getCount() != null && r.getCount() > 0)
            .map(r -> r.getRepairType().getTimeMinutes().multiply(BigDecimal.valueOf(r.getCount())))
            .reduce(BigDecimal.ZERO, BigDecimal::add);

    // effectiveTrips based on threshold bands
    BigDecimal effectiveTrips;
    int zeroThreshold = config.getRepairTravelZeroThreshold();
    int cap = config.getRepairTravelCap();

    if (kvo <= zeroThreshold) {
      effectiveTrips = BigDecimal.ZERO;
    } else if (kvo <= cap) {
      effectiveTrips = BigDecimal.valueOf(kvo);
    } else {
      effectiveTrips = BigDecimal.valueOf(cap);
    }

    BigDecimal repairTravel6months = effectiveTrips.multiply(roundTripMin);
    BigDecimal repairPzv6months =
        effectiveTrips.multiply(BigDecimal.valueOf(config.getPzvMinutes()));

    BigDecimal repairProductiveMonths = BigDecimal.valueOf(config.getRepairProductiveMonths());

    BigDecimal repairNoTravelMonthly =
        repairWork6months.divide(repairProductiveMonths, 10, RoundingMode.HALF_UP);

    BigDecimal repairWithTravelMonthly =
        repairWork6months
            .add(repairTravel6months)
            .add(repairPzv6months)
            .divide(repairProductiveMonths, 10, RoundingMode.HALF_UP);

    return new RepairResult(repairNoTravelMonthly, repairWithTravelMonthly);
  }
}
