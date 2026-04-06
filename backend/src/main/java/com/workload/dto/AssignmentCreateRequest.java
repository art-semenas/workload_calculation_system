package com.workload.dto;

import com.workload.entity.SystemType;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.util.UUID;

public record AssignmentCreateRequest(
    @NotNull UUID deviceTypeId,
    @NotNull SystemType systemType,
    @NotNull @DecimalMin("0.00") BigDecimal quantityMaintained) {}
