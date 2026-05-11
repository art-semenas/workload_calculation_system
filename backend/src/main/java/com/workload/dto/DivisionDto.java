package com.workload.dto;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

public record DivisionDto(
    UUID id,
    String name,
    Long branchCount,
    Long objectCount,
    OffsetDateTime createdAt,
    OffsetDateTime updatedAt,
    Long engineerCount,
    BigDecimal requiredFte,
    Long coverageGap,
    // PoC (S-02): always null until engineer load summaries are aggregated in MVP M-06.
    BigDecimal utilisation) {}
