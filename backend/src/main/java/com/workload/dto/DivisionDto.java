package com.workload.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

public record DivisionDto(
    UUID id,
    String name,
    @JsonProperty("branch_count") Long branchCount,
    @JsonProperty("object_count") Long objectCount,
    @JsonProperty("created_at") OffsetDateTime createdAt,
    @JsonProperty("updated_at") OffsetDateTime updatedAt,
    @JsonProperty("engineer_count") Long engineerCount,
    @JsonProperty("required_fte") BigDecimal requiredFte,
    @JsonProperty("coverage_gap") Long coverageGap,
    @JsonProperty("utilisation") BigDecimal utilisation) {}
