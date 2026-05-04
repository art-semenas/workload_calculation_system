package com.workload.dto;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

public record ObjectDto(
    UUID id,
    UUID branchId,
    String branchName,
    UUID divisionId,
    String divisionName,
    String name,
    Integer importSeqNo,
    BigDecimal itogoChisloWithTravel,
    Long engineerCount,
    OffsetDateTime createdAt,
    OffsetDateTime updatedAt) {}
