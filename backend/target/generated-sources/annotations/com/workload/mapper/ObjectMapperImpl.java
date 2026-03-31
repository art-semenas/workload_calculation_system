package com.workload.mapper;

import com.workload.dto.ObjectDto;
import com.workload.entity.Branch;
import com.workload.entity.Division;
import com.workload.entity.ObjectEntity;
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
public class ObjectMapperImpl implements ObjectMapper {

    @Override
    public ObjectDto toDto(ObjectEntity entity) {
        if ( entity == null ) {
            return null;
        }

        UUID branchId = null;
        UUID divisionId = null;
        UUID id = null;
        String name = null;
        Integer importSeqNo = null;
        OffsetDateTime createdAt = null;
        OffsetDateTime updatedAt = null;

        branchId = entityBranchId( entity );
        divisionId = entityBranchDivisionId( entity );
        id = entity.getId();
        name = entity.getName();
        importSeqNo = entity.getImportSeqNo();
        createdAt = entity.getCreatedAt();
        updatedAt = entity.getUpdatedAt();

        ObjectDto objectDto = new ObjectDto( id, branchId, divisionId, name, importSeqNo, createdAt, updatedAt );

        return objectDto;
    }

    private UUID entityBranchId(ObjectEntity objectEntity) {
        Branch branch = objectEntity.getBranch();
        if ( branch == null ) {
            return null;
        }
        return branch.getId();
    }

    private UUID entityBranchDivisionId(ObjectEntity objectEntity) {
        Branch branch = objectEntity.getBranch();
        if ( branch == null ) {
            return null;
        }
        Division division = branch.getDivision();
        if ( division == null ) {
            return null;
        }
        return division.getId();
    }
}
