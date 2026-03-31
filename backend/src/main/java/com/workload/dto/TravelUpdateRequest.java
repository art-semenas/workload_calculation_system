package com.workload.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;

public record TravelUpdateRequest(
    String transportType,
    @NotNull @DecimalMin("0.00") BigDecimal distanceKm,
    @NotNull @DecimalMin("0.00") BigDecimal oneWayTimeMin) {}
