package com.workload.mapper;

import com.workload.dto.DeviceSystemContextDto;
import com.workload.dto.DeviceTypeDto;
import com.workload.dto.RepairTypeDto;
import com.workload.entity.DeviceSystemContext;
import com.workload.entity.DeviceType;
import com.workload.entity.RepairType;
import java.util.List;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface CatalogMapper {

  @Mapping(target = "contexts", source = "contexts")
  DeviceTypeDto toDeviceTypeDto(DeviceType deviceType, List<DeviceSystemContext> contexts);

  @Mapping(target = "deviceTypeId", source = "deviceType.id")
  DeviceSystemContextDto toContextDto(DeviceSystemContext context);

  RepairTypeDto toRepairTypeDto(RepairType repairType);
}
