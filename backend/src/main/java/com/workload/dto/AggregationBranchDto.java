package com.workload.dto;

import java.math.BigDecimal;
import java.util.UUID;

public record AggregationBranchDto(
    UUID branchId,
    String branchName,
    UUID divisionId,
    String divisionName,
    int objectCount,
    BigDecimal requiredFte,
    BigDecimal staffingNeed,
    ComponentBreakdownDto breakdown) {}
