package com.workload.dto;

import com.workload.constant.WorkloadStatus;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

public record EngineerShareDto(
    UUID engineerId,
    String engineerName,
    BigDecimal objectShare,
    BigDecimal totalLoad,
    BigDecimal loadRatio,
    WorkloadStatus status,
    OffsetDateTime assignedAt) {}
