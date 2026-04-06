package com.workload.dto;

import com.workload.entity.SystemType;
import java.math.BigDecimal;
import java.util.UUID;

public record DeviceSystemContextDto(
    UUID id,
    UUID deviceTypeId,
    SystemType systemType,
    BigDecimal r1Minutes,
    BigDecimal r2Minutes) {}
