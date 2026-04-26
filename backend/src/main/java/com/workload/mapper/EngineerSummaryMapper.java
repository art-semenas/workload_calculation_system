package com.workload.mapper;

import com.workload.dto.EngineerSummaryDto;
import com.workload.entity.EngineerSummary;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface EngineerSummaryMapper {

  @Mapping(target = "engineerId", source = "engineer.id")
  @Mapping(
      target = "status",
      expression =
          "java(summary.getStatus() != null ? summary.getStatus().toUpperCase() : null)")
  EngineerSummaryDto toDto(EngineerSummary summary);
}
