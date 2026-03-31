package com.workload.dto;

import java.math.BigDecimal;
import java.util.UUID;

public record ObjectDeviceDto(
    UUID id,
    UUID objectId,
    UUID deviceTypeId,
    String deviceTypeName,
    BigDecimal quantityPhysical) {}
