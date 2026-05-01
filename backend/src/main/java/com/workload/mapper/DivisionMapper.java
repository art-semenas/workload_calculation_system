package com.workload.mapper;

import com.workload.dto.DivisionDto;
import com.workload.entity.Division;
import java.math.BigDecimal;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface DivisionMapper {

  @Mapping(target = "branchCount", source = "branchCount")
  @Mapping(target = "objectCount", source = "objectCount")
  DivisionDto toDto(Division division, Long branchCount, Long objectCount);

  @Mapping(target = "branchCount", source = "branchCount")
  @Mapping(target = "objectCount", source = "objectCount")
  @Mapping(target = "engineerCount", source = "engineerCount")
  @Mapping(target = "requiredFte", source = "requiredFte")
  @Mapping(target = "coverageGap", source = "coverageGap")
  @Mapping(target = "utilisation", source = "utilisation")
  DivisionDto toDto(
      Division division,
      Long branchCount,
      Long objectCount,
      Long engineerCount,
      BigDecimal requiredFte,
      Long coverageGap,
      BigDecimal utilisation);
}
