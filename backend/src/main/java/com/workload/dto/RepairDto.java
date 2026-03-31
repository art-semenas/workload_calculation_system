package com.workload.dto;

import java.util.UUID;

public record RepairDto(
        UUID id, UUID objectId, UUID repairTypeId, String repairTypeName, Integer count) {
}
