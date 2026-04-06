package com.workload.dto;

import com.workload.entity.SystemType;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;

public record DeviceSystemContextCreateRequest(
    @NotNull SystemType systemType,
    @NotNull @DecimalMin("0") BigDecimal r1Minutes,
    @NotNull @DecimalMin("0") BigDecimal r2Minutes) {}
