package com.workload.dto;

import java.math.BigDecimal;
import java.util.UUID;

public record AggregationDivisionDto(
    UUID divisionId,
    String divisionName,
    int objectCount,
    BigDecimal requiredFte,
    BigDecimal staffingNeed,
    BigDecimal uncoveredLoad,
    int coverageGapCount,
    int engineersTotal,
    int engineersOverloaded,
    int engineersWarning,
    ComponentBreakdownDto breakdown) {}
