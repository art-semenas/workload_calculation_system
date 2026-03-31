package com.workload.dto;

import java.time.OffsetDateTime;
import java.util.UUID;

public record DivisionDto(
    UUID id,
    String name,
    Long branchCount,
    Long objectCount,
    OffsetDateTime createdAt,
    OffsetDateTime updatedAt) {}
