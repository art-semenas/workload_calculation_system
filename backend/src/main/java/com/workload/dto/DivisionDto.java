package com.workload.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.time.OffsetDateTime;
import java.util.UUID;

public record DivisionDto(
    UUID id,
    String name,
    @JsonProperty("branch_count") Long branchCount,
    @JsonProperty("object_count") Long objectCount,
    @JsonProperty("created_at") OffsetDateTime createdAt,
    @JsonProperty("updated_at") OffsetDateTime updatedAt) {}
