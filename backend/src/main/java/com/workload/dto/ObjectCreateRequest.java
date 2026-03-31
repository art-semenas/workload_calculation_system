package com.workload.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.util.UUID;

public record ObjectCreateRequest(
    @NotNull UUID branchId, @NotBlank String name, Integer importSeqNo) {}
