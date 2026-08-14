package com.workload.dto;

import com.workload.entity.Role;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.UUID;

/**
 * {@code password} is optional: omitting it creates a placeholder account that cannot be logged
 * into until an administrator activates it via {@code PUT /admin/users/:id/activate}.
 */
public record AdminUserCreateRequest(
    @NotBlank @Email String email,
    @NotBlank String name,
    @NotNull Role role,
    UUID divisionId,
    @Size(min = 8) String password) {}
