package com.workload.dto;

import jakarta.validation.constraints.NotBlank;

public record DeviceTypeUpdateRequest(@NotBlank String name, String description) {}
