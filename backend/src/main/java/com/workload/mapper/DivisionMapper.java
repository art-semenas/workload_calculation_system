package com.workload.mapper;

import com.workload.dto.DivisionDto;
import com.workload.entity.Division;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface DivisionMapper {

    @Mapping(target = "branchCount", source = "branchCount")
    @Mapping(target = "objectCount", source = "objectCount")
    DivisionDto toDto(Division division, Long branchCount, Long objectCount);
}
