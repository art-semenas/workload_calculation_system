package com.workload.dto;

import jakarta.validation.constraints.NotBlank;
import java.util.UUID;

public record ObjectUpdateRequest(@NotBlank String name, Integer importSeqNo, UUID branchId) {}
