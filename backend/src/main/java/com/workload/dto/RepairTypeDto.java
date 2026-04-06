package com.workload.dto;

import java.math.BigDecimal;
import java.util.UUID;

public record RepairTypeDto(UUID id, String name, BigDecimal timeMinutes) {}
