package com.workload.dto;

import jakarta.validation.constraints.NotBlank;

public record ObjectUpdateRequest(@NotBlank String name, Integer importSeqNo) {
}
