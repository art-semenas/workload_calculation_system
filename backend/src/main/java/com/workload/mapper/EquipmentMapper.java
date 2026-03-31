package com.workload.mapper;

import com.workload.dto.AssignmentDto;
import com.workload.dto.ObjectDeviceDto;
import com.workload.dto.RecordsDto;
import com.workload.dto.RepairDto;
import com.workload.dto.TravelDto;
import com.workload.entity.ObjectDevice;
import com.workload.entity.ObjectRepair;
import com.workload.entity.ObjectSystemAssignment;
import com.workload.entity.RecordsTask;
import com.workload.entity.Travel;
import java.math.BigDecimal;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface EquipmentMapper {

    @Mapping(target = "objectId", source = "object.id")
    @Mapping(target = "deviceTypeId", source = "deviceType.id")
    @Mapping(target = "deviceTypeName", source = "deviceType.name")
    ObjectDeviceDto toDeviceDto(ObjectDevice device);

    @Mapping(target = "objectId", source = "object.id")
    @Mapping(target = "deviceTypeId", source = "deviceType.id")
    @Mapping(target = "deviceTypeName", source = "deviceType.name")
    @Mapping(target = "contextId", source = "context.id")
    AssignmentDto toAssignmentDto(ObjectSystemAssignment assignment);

    @Mapping(target = "objectId", source = "object.id")
    @Mapping(target = "repairTypeId", source = "repairType.id")
    @Mapping(target = "repairTypeName", source = "repairType.name")
    RepairDto toRepairDto(ObjectRepair repair);

    @Mapping(target = "objectId", source = "object.id")
    RecordsDto toRecordsDto(RecordsTask task);

    @Mapping(target = "objectId", source = "object.id")
    @Mapping(target = "roundTripMin", expression = "java(computeRoundTrip(travel))")
    TravelDto toTravelDto(Travel travel);

    default BigDecimal computeRoundTrip(Travel travel) {
        if (travel.getOneWayTimeMin() == null) {
            return BigDecimal.ZERO;
        }
        return travel.getOneWayTimeMin().multiply(BigDecimal.valueOf(2));
    }
}
