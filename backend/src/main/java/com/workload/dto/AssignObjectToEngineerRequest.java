package com.workload.dto;

import jakarta.validation.constraints.NotNull;
import java.util.UUID;

public record AssignObjectToEngineerRequest(@NotNull UUID objectId) {}
