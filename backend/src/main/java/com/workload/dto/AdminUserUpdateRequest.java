package com.workload.dto;

import com.workload.entity.Role;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.util.UUID;

public record AdminUserUpdateRequest(
    @NotBlank @Email String email, @NotBlank String name, @NotNull Role role, UUID divisionId) {}
