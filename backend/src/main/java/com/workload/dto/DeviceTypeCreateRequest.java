package com.workload.dto;

import jakarta.validation.constraints.NotBlank;

public record DeviceTypeCreateRequest(@NotBlank String name, String description) {}
