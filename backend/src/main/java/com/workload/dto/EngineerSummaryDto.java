package com.workload.dto;

import com.workload.constant.WorkloadStatus;
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
    WorkloadStatus status,
    OffsetDateTime computedAt) {}
