package com.workload.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public record RepairUpdateRequest(@NotNull @Min(0) Integer count) {
}
