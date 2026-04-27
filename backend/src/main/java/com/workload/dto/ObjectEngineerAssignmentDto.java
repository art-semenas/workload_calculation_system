package com.workload.dto;

import java.time.OffsetDateTime;
import java.util.UUID;

public record ObjectEngineerAssignmentDto(
    UUID id, UUID objectId, UUID engineerId, OffsetDateTime assignedAt) {}
