package com.workload.dto;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

public record EngineerObjectDto(
    UUID objectId,
    String objectName,
    String branchName,
    String divisionName,
    BigDecimal engineerShare,
    BigDecimal itogoChisloWithTravel,
    Integer engineerCount,
    OffsetDateTime assignedAt) {}
