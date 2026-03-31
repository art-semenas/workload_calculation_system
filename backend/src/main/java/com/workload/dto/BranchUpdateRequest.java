package com.workload.dto;

import jakarta.validation.constraints.NotBlank;

public record BranchUpdateRequest(@NotBlank String name) {
}
