package com.workload.dto;

import java.time.OffsetDateTime;
import java.util.UUID;

public record ObjectDto(
        UUID id,
        UUID branchId,
        UUID divisionId,
        String name,
        Integer importSeqNo,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt) {
}
