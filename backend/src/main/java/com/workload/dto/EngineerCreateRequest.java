package com.workload.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.util.UUID;

public record EngineerCreateRequest(
    @NotBlank @Email String email,
    @NotBlank String name,
    @NotBlank @Size(min = 8) String password,
    @NotNull @DecimalMin("0.01") BigDecimal capacityFte,
    UUID homeDivisionId,
    String employeeId) {}
