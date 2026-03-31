package com.workload.dto;

import com.workload.entity.Role;
import java.math.BigDecimal;
import java.util.UUID;

public record UserDto(
        UUID id,
        String email,
        String name,
        Role role,
        UUID divisionId,
        UUID homeDivisionId,
        BigDecimal capacityFte,
        String employeeId,
        boolean active,
        boolean requiresActivation) {
}
