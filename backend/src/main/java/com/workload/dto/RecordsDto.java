package com.workload.dto;

import java.util.UUID;

public record RecordsDto(
    UUID id,
    UUID objectId,
    Integer accessRequests,
    Integer monitoringRequests,
    Integer footageRequests,
    Integer backupControl,
    Integer securityAdmin) {}
