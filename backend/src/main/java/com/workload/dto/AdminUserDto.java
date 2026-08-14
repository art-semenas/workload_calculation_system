package com.workload.dto;

import com.workload.entity.Role;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * User representation for the admin management screen. Unlike {@link UserDto} (the caller's own
 * profile) it exposes account state an administrator has to act on — activation, lockout, and
 * whether the account is an engineer, which is independent of {@code role}.
 */
public record AdminUserDto(
    UUID id,
    String email,
    String name,
    Role role,
    UUID divisionId,
    UUID homeDivisionId,
    BigDecimal capacityFte,
    String employeeId,
    boolean active,
    boolean requiresActivation,
    boolean engineer,
    OffsetDateTime lockedUntil,
    OffsetDateTime createdAt,
    OffsetDateTime updatedAt) {}
