package com.workload.dto;

import java.time.OffsetDateTime;
import java.util.UUID;

public record BranchDto(
        UUID id,
        UUID divisionId,
        String name,
        Long objectCount,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt) {
}
