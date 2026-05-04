package com.workload.mapper;

import com.workload.dto.ObjectDto;
import com.workload.entity.ObjectEntity;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface ObjectMapper {

  @Mapping(target = "branchId", source = "branch.id")
  @Mapping(target = "branchName", source = "branch.name")
  @Mapping(target = "divisionId", source = "branch.division.id")
  @Mapping(target = "divisionName", source = "branch.division.name")
  @Mapping(target = "itogoChisloWithTravel", ignore = true)
  @Mapping(target = "engineerCount", ignore = true)
  ObjectDto toDto(ObjectEntity entity);
}
