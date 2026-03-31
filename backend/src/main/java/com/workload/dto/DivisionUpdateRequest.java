package com.workload.dto;

import jakarta.validation.constraints.NotBlank;

public record DivisionUpdateRequest(@NotBlank String name) {
}
