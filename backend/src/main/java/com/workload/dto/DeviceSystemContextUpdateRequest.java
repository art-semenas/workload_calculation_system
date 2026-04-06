package com.workload.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;

public record DeviceSystemContextUpdateRequest(
    @NotNull @DecimalMin("0") BigDecimal r1Minutes,
    @NotNull @DecimalMin("0") BigDecimal r2Minutes) {}
