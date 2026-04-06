package com.workload.dto;

import java.math.BigDecimal;
import java.util.UUID;

public record TravelDto(
    UUID id,
    UUID objectId,
    String transportType,
    BigDecimal distanceKm,
    BigDecimal oneWayTimeMin,
    BigDecimal roundTripMin) {}
