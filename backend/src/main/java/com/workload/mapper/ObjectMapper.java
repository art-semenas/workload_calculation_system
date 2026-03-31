package com.workload.mapper;

import com.workload.dto.ObjectDto;
import com.workload.entity.ObjectEntity;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface ObjectMapper {

    @Mapping(target = "branchId", source = "branch.id")
    @Mapping(target = "divisionId", source = "branch.division.id")
    ObjectDto toDto(ObjectEntity entity);
}
