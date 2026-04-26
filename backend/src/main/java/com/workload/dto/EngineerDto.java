package com.workload.dto;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

public record EngineerDto(
    UUID id,
    String email,
    String name,
    String role,
    UUID homeDivisionId,
    String homeDivisionName,
    BigDecimal capacityFte,
    String employeeId,
    boolean isActive,
    Integer objectCount,
    BigDecimal totalLoad,
    BigDecimal loadRatio,
    String status,
    OffsetDateTime createdAt) {}
