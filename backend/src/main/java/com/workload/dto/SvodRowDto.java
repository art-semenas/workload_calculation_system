package com.workload.dto;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

public record SvodRowDto(
    UUID objectId,
    String objectName,
    String address,
    String divisionName,
    String branchName,
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
    BigDecimal r1PerVisitTotal,
    BigDecimal r2PerVisitTotal,
    OffsetDateTime computedAt) {}
