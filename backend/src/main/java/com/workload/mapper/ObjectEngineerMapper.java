package com.workload.mapper;

import com.workload.dto.ObjectEngineerAssignmentDto;
import com.workload.entity.ObjectEngineer;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface ObjectEngineerMapper {

  @Mapping(target = "objectId", source = "object.id")
  @Mapping(target = "engineerId", source = "engineer.id")
  ObjectEngineerAssignmentDto toAssignmentDto(ObjectEngineer objectEngineer);
}
