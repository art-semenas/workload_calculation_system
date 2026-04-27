package com.workload.dto;

import jakarta.validation.constraints.NotNull;
import java.util.UUID;

public record AssignEngineerToObjectRequest(@NotNull UUID engineerId) {}
