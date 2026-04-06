package com.workload.mapper;

import com.workload.dto.BranchDto;
import com.workload.entity.Branch;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface BranchMapper {

  @Mapping(target = "divisionId", source = "branch.division.id")
  @Mapping(target = "objectCount", source = "objectCount")
  BranchDto toDto(Branch branch, Long objectCount);
}
