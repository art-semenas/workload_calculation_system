package com.workload.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.util.UUID;

public record EngineerUpdateRequest(
    @NotBlank String name,
    @NotNull @DecimalMin("0.01") BigDecimal capacityFte,
    UUID homeDivisionId,
    String employeeId) {}
