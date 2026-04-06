package com.workload.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;

public record TravelUpdateRequest(
    String transportType,
    @NotNull @DecimalMin("0.00") BigDecimal distanceKm,
    @NotNull @DecimalMin("0.00") BigDecimal oneWayTimeMin,
    // Captured only to reject — must be null. round_trip_min alias covers snake_case clients.
    @JsonAlias("round_trip_min") BigDecimal roundTripMin) {}
