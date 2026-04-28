package com.workload.mapper;

import com.workload.constant.WorkloadStatus;
import com.workload.dto.EngineerCreateRequest;
import com.workload.dto.EngineerDto;
import com.workload.entity.EngineerSummary;
import com.workload.entity.User;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(
    componentModel = "spring",
    imports = {WorkloadStatus.class})
public interface EngineerMapper {

  @Mapping(target = "id", source = "user.id")
  @Mapping(target = "email", source = "user.email")
  @Mapping(target = "name", source = "user.name")
  @Mapping(target = "role", expression = "java(user.getRole().getValue())")
  @Mapping(target = "homeDivisionId", source = "user.homeDivisionId")
  @Mapping(target = "homeDivisionName", source = "homeDivisionName")
  @Mapping(target = "capacityFte", source = "user.capacityFte")
  @Mapping(target = "employeeId", source = "user.employeeId")
  @Mapping(target = "isActive", source = "user.active")
  @Mapping(target = "objectCount", source = "summary.objectCount")
  @Mapping(target = "totalLoad", source = "summary.totalLoad")
  @Mapping(target = "loadRatio", source = "summary.loadRatio")
  @Mapping(
      target = "status",
      expression =
          "java(summary != null && summary.getStatus() != null ?"
              + " WorkloadStatus.fromString(summary.getStatus()) : null)")
  @Mapping(target = "createdAt", source = "user.createdAt")
  EngineerDto toDto(User user, EngineerSummary summary, String homeDivisionName);

  @Mapping(target = "role", expression = "java(com.workload.entity.Role.ENGINEER)")
  @Mapping(target = "active", expression = "java(true)")
  @Mapping(target = "requiresActivation", expression = "java(false)")
  @Mapping(target = "id", ignore = true)
  @Mapping(target = "passwordHash", ignore = true)
  @Mapping(target = "divisionId", ignore = true)
  @Mapping(target = "createdAt", ignore = true)
  @Mapping(target = "updatedAt", ignore = true)
  User toEntity(EngineerCreateRequest request);
}
