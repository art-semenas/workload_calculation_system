package com.workload.dto;

import com.workload.entity.SystemType;
import java.math.BigDecimal;
import java.util.UUID;

public record AssignmentDto(
        UUID id,
        UUID objectId,
        UUID deviceTypeId,
        String deviceTypeName,
        SystemType systemType,
        BigDecimal quantityMaintained,
        UUID contextId) {
}
