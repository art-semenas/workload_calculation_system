package com.workload.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;

public record RepairTypeCreateRequest(
    @NotBlank String name, @NotNull @DecimalMin("0") BigDecimal timeMinutes) {}
