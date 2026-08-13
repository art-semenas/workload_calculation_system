package com.workload.service.calculation;

import com.workload.config.WorkloadConfig;
import com.workload.entity.RecordsTask;
import java.math.BigDecimal;
import java.math.RoundingMode;
import org.springframework.stereotype.Component;

@Component
public class RecordsCalculationHelper {

  public BigDecimal calculateMonthly(RecordsTask records, WorkloadConfig config) {
    if (records == null) {
      return BigDecimal.ZERO;
    }

    BigDecimal records6months =
        records
            .getAccessRequests()
            .multiply(BigDecimal.valueOf(config.getRecordsAccessMinutes()))
            .add(
                records
                    .getMonitoringRequests()
                    .multiply(BigDecimal.valueOf(config.getRecordsMonitoringMinutes())))
            .add(
                records
                    .getFootageRequests()
                    .multiply(BigDecimal.valueOf(config.getRecordsFootageMinutes())))
            .add(records.getBackupControl().multiply(config.getRecordsBackupMinutes()))
            .add(
                records
                    .getSecurityAdmin()
                    .multiply(BigDecimal.valueOf(config.getRecordsAdminMinutes())));

    // Divisor is PRODUCTIVE_MONTHS (5), not the 6-month period length: the workbook spreads a
    // 6-month total over 5 productive months, the sixth being absorbed by leave and other
    // non-productive time. Matches Записи Расчет!L = K / 5. Same basis as repairs.
    return records6months.divide(
        BigDecimal.valueOf(config.getProductiveMonths()), 10, RoundingMode.HALF_UP);
  }
}
