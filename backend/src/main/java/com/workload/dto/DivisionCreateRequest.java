package com.workload.dto;

import jakarta.validation.constraints.NotBlank;

public record DivisionCreateRequest(@NotBlank String name) {}
