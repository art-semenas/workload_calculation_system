package com.workload.mapper;

import com.workload.dto.ObjectDto;
import com.workload.entity.ObjectEntity;
import com.workload.repository.ObjectEnrichedRow;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface ObjectMapper {

  @Mapping(target = "branchId", source = "branch.id")
  @Mapping(target = "branchName", source = "branch.name")
  @Mapping(target = "divisionId", source = "branch.division.id")
  @Mapping(target = "divisionName", source = "branch.division.name")
  // PoC (S-02): itogoChisloWithTravel and engineerCount are populated only via the
  // findAllEnriched() JPQL projection query. The entity-based path (findById) returns null
  // for both fields. Full population deferred to MVP M-06 when a dedicated summary endpoint lands.
  @Mapping(target = "itogoChisloWithTravel", ignore = true)
  @Mapping(target = "engineerCount", ignore = true)
  ObjectDto toDto(ObjectEntity entity);

  ObjectDto toDto(ObjectEnrichedRow row);
}
