package com.workload.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.util.UUID;

public record ObjectDeviceUpsertRequest(
    @NotNull UUID deviceTypeId, @NotNull @DecimalMin("0.00") BigDecimal quantityPhysical) {}
