package com.workload.mapper;

import com.workload.dto.SummaryDto;
import com.workload.entity.Summary;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface SummaryMapper {

  @Mapping(target = "objectId", source = "object.id")
  SummaryDto toDto(Summary entity);
}
