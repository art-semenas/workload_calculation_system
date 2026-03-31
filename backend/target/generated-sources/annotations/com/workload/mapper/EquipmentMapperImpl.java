package com.workload.mapper;

import com.workload.dto.AssignmentDto;
import com.workload.dto.ObjectDeviceDto;
import com.workload.dto.RecordsDto;
import com.workload.dto.RepairDto;
import com.workload.dto.TravelDto;
import com.workload.entity.DeviceSystemContext;
import com.workload.entity.DeviceType;
import com.workload.entity.ObjectDevice;
import com.workload.entity.ObjectEntity;
import com.workload.entity.ObjectRepair;
import com.workload.entity.ObjectSystemAssignment;
import com.workload.entity.RecordsTask;
import com.workload.entity.RepairType;
import com.workload.entity.SystemType;
import com.workload.entity.Travel;
import java.math.BigDecimal;
import java.util.UUID;
import javax.annotation.processing.Generated;
import org.springframework.stereotype.Component;

@Generated(
    value = "org.mapstruct.ap.MappingProcessor",
    date = "2026-03-31T22:13:46+0300",
    comments = "version: 1.6.3, compiler: javac, environment: Java 21.0.6 (Amazon.com Inc.)"
)
@Component
public class EquipmentMapperImpl implements EquipmentMapper {

    @Override
    public ObjectDeviceDto toDeviceDto(ObjectDevice device) {
        if ( device == null ) {
            return null;
        }

        UUID objectId = null;
        UUID deviceTypeId = null;
        String deviceTypeName = null;
        UUID id = null;
        BigDecimal quantityPhysical = null;

        objectId = deviceObjectId( device );
        deviceTypeId = deviceDeviceTypeId( device );
        deviceTypeName = deviceDeviceTypeName( device );
        id = device.getId();
        quantityPhysical = device.getQuantityPhysical();

        ObjectDeviceDto objectDeviceDto = new ObjectDeviceDto( id, objectId, deviceTypeId, deviceTypeName, quantityPhysical );

        return objectDeviceDto;
    }

    @Override
    public AssignmentDto toAssignmentDto(ObjectSystemAssignment assignment) {
        if ( assignment == null ) {
            return null;
        }

        UUID objectId = null;
        UUID deviceTypeId = null;
        String deviceTypeName = null;
        UUID contextId = null;
        UUID id = null;
        SystemType systemType = null;
        BigDecimal quantityMaintained = null;

        objectId = assignmentObjectId( assignment );
        deviceTypeId = assignmentDeviceTypeId( assignment );
        deviceTypeName = assignmentDeviceTypeName( assignment );
        contextId = assignmentContextId( assignment );
        id = assignment.getId();
        systemType = assignment.getSystemType();
        quantityMaintained = assignment.getQuantityMaintained();

        AssignmentDto assignmentDto = new AssignmentDto( id, objectId, deviceTypeId, deviceTypeName, systemType, quantityMaintained, contextId );

        return assignmentDto;
    }

    @Override
    public RepairDto toRepairDto(ObjectRepair repair) {
        if ( repair == null ) {
            return null;
        }

        UUID objectId = null;
        UUID repairTypeId = null;
        String repairTypeName = null;
        UUID id = null;
        Integer count = null;

        objectId = repairObjectId( repair );
        repairTypeId = repairRepairTypeId( repair );
        repairTypeName = repairRepairTypeName( repair );
        id = repair.getId();
        count = repair.getCount();

        RepairDto repairDto = new RepairDto( id, objectId, repairTypeId, repairTypeName, count );

        return repairDto;
    }

    @Override
    public RecordsDto toRecordsDto(RecordsTask task) {
        if ( task == null ) {
            return null;
        }

        UUID objectId = null;
        UUID id = null;
        Integer accessRequests = null;
        Integer monitoringRequests = null;
        Integer footageRequests = null;
        Integer backupControl = null;
        Integer securityAdmin = null;

        objectId = taskObjectId( task );
        id = task.getId();
        accessRequests = task.getAccessRequests();
        monitoringRequests = task.getMonitoringRequests();
        footageRequests = task.getFootageRequests();
        backupControl = task.getBackupControl();
        securityAdmin = task.getSecurityAdmin();

        RecordsDto recordsDto = new RecordsDto( id, objectId, accessRequests, monitoringRequests, footageRequests, backupControl, securityAdmin );

        return recordsDto;
    }

    @Override
    public TravelDto toTravelDto(Travel travel) {
        if ( travel == null ) {
            return null;
        }

        UUID objectId = null;
        UUID id = null;
        String transportType = null;
        BigDecimal distanceKm = null;
        BigDecimal oneWayTimeMin = null;

        objectId = travelObjectId( travel );
        id = travel.getId();
        transportType = travel.getTransportType();
        distanceKm = travel.getDistanceKm();
        oneWayTimeMin = travel.getOneWayTimeMin();

        BigDecimal roundTripMin = computeRoundTrip(travel);

        TravelDto travelDto = new TravelDto( id, objectId, transportType, distanceKm, oneWayTimeMin, roundTripMin );

        return travelDto;
    }

    private UUID deviceObjectId(ObjectDevice objectDevice) {
        ObjectEntity object = objectDevice.getObject();
        if ( object == null ) {
            return null;
        }
        return object.getId();
    }

    private UUID deviceDeviceTypeId(ObjectDevice objectDevice) {
        DeviceType deviceType = objectDevice.getDeviceType();
        if ( deviceType == null ) {
            return null;
        }
        return deviceType.getId();
    }

    private String deviceDeviceTypeName(ObjectDevice objectDevice) {
        DeviceType deviceType = objectDevice.getDeviceType();
        if ( deviceType == null ) {
            return null;
        }
        return deviceType.getName();
    }

    private UUID assignmentObjectId(ObjectSystemAssignment objectSystemAssignment) {
        ObjectEntity object = objectSystemAssignment.getObject();
        if ( object == null ) {
            return null;
        }
        return object.getId();
    }

    private UUID assignmentDeviceTypeId(ObjectSystemAssignment objectSystemAssignment) {
        DeviceType deviceType = objectSystemAssignment.getDeviceType();
        if ( deviceType == null ) {
            return null;
        }
        return deviceType.getId();
    }

    private String assignmentDeviceTypeName(ObjectSystemAssignment objectSystemAssignment) {
        DeviceType deviceType = objectSystemAssignment.getDeviceType();
        if ( deviceType == null ) {
            return null;
        }
        return deviceType.getName();
    }

    private UUID assignmentContextId(ObjectSystemAssignment objectSystemAssignment) {
        DeviceSystemContext context = objectSystemAssignment.getContext();
        if ( context == null ) {
            return null;
        }
        return context.getId();
    }

    private UUID repairObjectId(ObjectRepair objectRepair) {
        ObjectEntity object = objectRepair.getObject();
        if ( object == null ) {
            return null;
        }
        return object.getId();
    }

    private UUID repairRepairTypeId(ObjectRepair objectRepair) {
        RepairType repairType = objectRepair.getRepairType();
        if ( repairType == null ) {
            return null;
        }
        return repairType.getId();
    }

    private String repairRepairTypeName(ObjectRepair objectRepair) {
        RepairType repairType = objectRepair.getRepairType();
        if ( repairType == null ) {
            return null;
        }
        return repairType.getName();
    }

    private UUID taskObjectId(RecordsTask recordsTask) {
        ObjectEntity object = recordsTask.getObject();
        if ( object == null ) {
            return null;
        }
        return object.getId();
    }

    private UUID travelObjectId(Travel travel) {
        ObjectEntity object = travel.getObject();
        if ( object == null ) {
            return null;
        }
        return object.getId();
    }
}
