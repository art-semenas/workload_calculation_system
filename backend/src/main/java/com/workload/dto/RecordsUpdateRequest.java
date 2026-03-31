package com.workload.dto;

import jakarta.validation.constraints.Min;

public record RecordsUpdateRequest(
    @Min(0) Integer accessRequests,
    @Min(0) Integer monitoringRequests,
    @Min(0) Integer footageRequests,
    @Min(0) Integer backupControl,
    @Min(0) Integer securityAdmin) {}
