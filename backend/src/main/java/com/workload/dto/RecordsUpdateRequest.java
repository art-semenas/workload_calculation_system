package com.workload.dto;

import jakarta.validation.constraints.DecimalMin;
import java.math.BigDecimal;

public record RecordsUpdateRequest(
    @DecimalMin("0") BigDecimal accessRequests,
    @DecimalMin("0") BigDecimal monitoringRequests,
    @DecimalMin("0") BigDecimal footageRequests,
    @DecimalMin("0") BigDecimal backupControl,
    @DecimalMin("0") BigDecimal securityAdmin) {}
