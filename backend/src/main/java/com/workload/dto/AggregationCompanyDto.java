package com.workload.dto;

import java.math.BigDecimal;

public record AggregationCompanyDto(
    BigDecimal requiredFte,
    BigDecimal staffingNeed,
    int objectCount,
    int divisionCount,
    ComponentBreakdownDto breakdown) {}
