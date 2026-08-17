package com.workload.dto;

import com.workload.entity.Role;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.util.UUID;

/**
 * {@code unlock} is the administrator's explicit lockout release (epic MVP M-02 §"Account
 * Lockout"). It is opt-in: an ordinary edit of a locked account leaves the lockout in place, so
 * fixing a typo in someone's name never silently readmits a brute-forced account.
 */
public record AdminUserUpdateRequest(
    @NotBlank @Email String email,
    @NotBlank String name,
    @NotNull Role role,
    UUID divisionId,
    Boolean unlock) {}
