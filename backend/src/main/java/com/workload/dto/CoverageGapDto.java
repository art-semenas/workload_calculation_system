package com.workload.dto;

import java.math.BigDecimal;
import java.util.UUID;

public record CoverageGapDto(
    UUID objectId,
    String objectName,
    String address,
    String divisionName,
    String branchName,
    BigDecimal itogoChisloWithTravel) {}
