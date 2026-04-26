package com.workload.dto;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

public record EngineerSummaryDto(
    UUID engineerId,
    BigDecimal totalLoad,
    Integer objectCount,
    BigDecimal osLoad,
    BigDecimal psLoad,
    BigDecimal videoLoad,
    BigDecimal recordsLoad,
    BigDecimal repairLoad,
    BigDecimal capacityFte,
    BigDecimal loadRatio,
    String status,
    OffsetDateTime computedAt) {}
