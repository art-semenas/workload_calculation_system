package com.workload.mapper;

import com.workload.dto.DivisionDto;
import com.workload.entity.Division;
import java.time.OffsetDateTime;
import java.util.UUID;
import javax.annotation.processing.Generated;
import org.springframework.stereotype.Component;

@Generated(
    value = "org.mapstruct.ap.MappingProcessor",
    date = "2026-03-31T22:13:46+0300",
    comments = "version: 1.6.3, compiler: javac, environment: Java 21.0.6 (Amazon.com Inc.)"
)
@Component
public class DivisionMapperImpl implements DivisionMapper {

    @Override
    public DivisionDto toDto(Division division, Long branchCount, Long objectCount) {
        if ( division == null && branchCount == null && objectCount == null ) {
            return null;
        }

        UUID id = null;
        String name = null;
        OffsetDateTime createdAt = null;
        OffsetDateTime updatedAt = null;
        if ( division != null ) {
            id = division.getId();
            name = division.getName();
            createdAt = division.getCreatedAt();
            updatedAt = division.getUpdatedAt();
        }
        Long branchCount1 = null;
        branchCount1 = branchCount;
        Long objectCount1 = null;
        objectCount1 = objectCount;

        DivisionDto divisionDto = new DivisionDto( id, name, branchCount1, objectCount1, createdAt, updatedAt );

        return divisionDto;
    }
}
