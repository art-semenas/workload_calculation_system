package com.workload.mapper;

import com.workload.constant.WorkloadStatus;
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
          "java(summary.getStatus() != null ? WorkloadStatus.fromString(summary.getStatus()) : WorkloadStatus.NORMAL)")
  // WorkloadStatus is used in the expression above
  @SuppressWarnings("unused")
  EngineerSummaryDto toDto(EngineerSummary summary);
}
