package com.workload.dto;

import java.math.BigDecimal;
import java.util.UUID;

public record RecordsDto(
    UUID id,
    UUID objectId,
    BigDecimal accessRequests,
    BigDecimal monitoringRequests,
    BigDecimal footageRequests,
    BigDecimal backupControl,
    BigDecimal securityAdmin) {}
