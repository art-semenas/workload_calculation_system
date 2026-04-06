package com.workload.dto;

import java.util.List;
import java.util.UUID;

public record DeviceTypeDto(
    UUID id, String name, String description, List<DeviceSystemContextDto> contexts) {}
