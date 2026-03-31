package com.workload.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record ApiError(
        String code, String message, @JsonProperty("affected_count") Integer affectedCount) {
}
