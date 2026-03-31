package com.workload.dto;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

public record SummaryDto(
    UUID id,
    UUID objectId,
    BigDecimal osR1PerVisit,
    BigDecimal osR2PerVisit,
    BigDecimal psR1PerVisit,
    BigDecimal psR2PerVisit,
    BigDecimal videoR1PerVisit,
    BigDecimal videoR2PerVisit,
    BigDecimal r1PerVisitTotal,
    BigDecimal r2PerVisitTotal,
    BigDecimal osMonthlyAvg,
    BigDecimal psMonthlyAvg,
    BigDecimal videoMonthlyAvg,
    BigDecimal recordsMonthly,
    BigDecimal repairNoTravelMonthly,
    BigDecimal repairWithTravelMonthly,
    BigDecimal roundTripMin,
    BigDecimal pzvMinutes,
    BigDecimal totalNoTravelMin,
    BigDecimal itogoChisloNoTravel,
    BigDecimal totalWithTravelMin,
    BigDecimal itogoChisloWithTravel,
    OffsetDateTime computedAt) {}
