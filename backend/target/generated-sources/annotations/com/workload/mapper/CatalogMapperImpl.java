package com.workload.mapper;

import com.workload.dto.DeviceSystemContextDto;
import com.workload.dto.DeviceTypeDto;
import com.workload.dto.RepairTypeDto;
import com.workload.entity.DeviceSystemContext;
import com.workload.entity.DeviceType;
import com.workload.entity.RepairType;
import com.workload.entity.SystemType;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import javax.annotation.processing.Generated;
import org.springframework.stereotype.Component;

@Generated(
    value = "org.mapstruct.ap.MappingProcessor",
    date = "2026-03-31T22:13:47+0300",
    comments = "version: 1.6.3, compiler: javac, environment: Java 21.0.6 (Amazon.com Inc.)"
)
@Component
public class CatalogMapperImpl implements CatalogMapper {

    @Override
    public DeviceTypeDto toDeviceTypeDto(DeviceType deviceType, List<DeviceSystemContext> contexts) {
        if ( deviceType == null && contexts == null ) {
            return null;
        }

        UUID id = null;
        String name = null;
        String description = null;
        if ( deviceType != null ) {
            id = deviceType.getId();
            name = deviceType.getName();
            description = deviceType.getDescription();
        }
        List<DeviceSystemContextDto> contexts1 = null;
        contexts1 = deviceSystemContextListToDeviceSystemContextDtoList( contexts );

        DeviceTypeDto deviceTypeDto = new DeviceTypeDto( id, name, description, contexts1 );

        return deviceTypeDto;
    }

    @Override
    public DeviceSystemContextDto toContextDto(DeviceSystemContext context) {
        if ( context == null ) {
            return null;
        }

        UUID deviceTypeId = null;
        UUID id = null;
        SystemType systemType = null;
        BigDecimal r1Minutes = null;
        BigDecimal r2Minutes = null;

        deviceTypeId = contextDeviceTypeId( context );
        id = context.getId();
        systemType = context.getSystemType();
        r1Minutes = context.getR1Minutes();
        r2Minutes = context.getR2Minutes();

        DeviceSystemContextDto deviceSystemContextDto = new DeviceSystemContextDto( id, deviceTypeId, systemType, r1Minutes, r2Minutes );

        return deviceSystemContextDto;
    }

    @Override
    public RepairTypeDto toRepairTypeDto(RepairType repairType) {
        if ( repairType == null ) {
            return null;
        }

        UUID id = null;
        String name = null;
        BigDecimal timeMinutes = null;

        id = repairType.getId();
        name = repairType.getName();
        timeMinutes = repairType.getTimeMinutes();

        RepairTypeDto repairTypeDto = new RepairTypeDto( id, name, timeMinutes );

        return repairTypeDto;
    }

    protected List<DeviceSystemContextDto> deviceSystemContextListToDeviceSystemContextDtoList(List<DeviceSystemContext> list) {
        if ( list == null ) {
            return null;
        }

        List<DeviceSystemContextDto> list1 = new ArrayList<DeviceSystemContextDto>( list.size() );
        for ( DeviceSystemContext deviceSystemContext : list ) {
            list1.add( toContextDto( deviceSystemContext ) );
        }

        return list1;
    }

    private UUID contextDeviceTypeId(DeviceSystemContext deviceSystemContext) {
        DeviceType deviceType = deviceSystemContext.getDeviceType();
        if ( deviceType == null ) {
            return null;
        }
        return deviceType.getId();
    }
}
