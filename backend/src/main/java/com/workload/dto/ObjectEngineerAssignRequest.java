package com.workload.dto;

import jakarta.validation.constraints.NotNull;
import java.util.UUID;

public record ObjectEngineerAssignRequest(@NotNull UUID engineerId, @NotNull UUID objectId) {}
