package com.workload.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Administrator-issued credential for {@code PUT /admin/users/:id/password} — the "provides or
 * resets the password" step TOR §10.2 assumes when activating a placeholder account. Kept off
 * {@link AdminUserUpdateRequest} so a password can never ride along on an ordinary profile edit.
 */
public record AdminUserPasswordRequest(@NotBlank @Size(min = 8) String password) {}
