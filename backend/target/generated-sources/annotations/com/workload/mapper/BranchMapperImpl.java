package com.workload.mapper;

import com.workload.dto.BranchDto;
import com.workload.entity.Branch;
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
public class BranchMapperImpl implements BranchMapper {

    @Override
    public BranchDto toDto(Branch branch, Long objectCount) {
        if ( branch == null && objectCount == null ) {
            return null;
        }

        UUID divisionId = null;
        UUID id = null;
        String name = null;
        OffsetDateTime createdAt = null;
        OffsetDateTime updatedAt = null;
        if ( branch != null ) {
            divisionId = branchDivisionId( branch );
            id = branch.getId();
            name = branch.getName();
            createdAt = branch.getCreatedAt();
            updatedAt = branch.getUpdatedAt();
        }
        Long objectCount1 = null;
        objectCount1 = objectCount;

        BranchDto branchDto = new BranchDto( id, divisionId, name, objectCount1, createdAt, updatedAt );

        return branchDto;
    }

    private UUID branchDivisionId(Branch branch) {
        Division division = branch.getDivision();
        if ( division == null ) {
            return null;
        }
        return division.getId();
    }
}
