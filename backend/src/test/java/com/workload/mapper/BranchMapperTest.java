package com.workload.mapper;

import static org.assertj.core.api.Assertions.assertThat;

import com.workload.dto.BranchDto;
import com.workload.entity.Branch;
import com.workload.entity.Division;
import java.time.OffsetDateTime;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.mapstruct.factory.Mappers;

class BranchMapperTest {

  private final BranchMapper mapper = Mappers.getMapper(BranchMapper.class);

  @Test
  void mapsBranchToDto() {
    Division division =
        Division.builder()
            .id(UUID.fromString("22222222-2222-2222-2222-222222222222"))
            .name("Test Division")
            .createdAt(OffsetDateTime.parse("2026-03-30T10:00:00+00:00"))
            .updatedAt(OffsetDateTime.parse("2026-03-30T10:00:00+00:00"))
            .build();

    Branch branch =
        Branch.builder()
            .id(UUID.fromString("33333333-3333-3333-3333-333333333333"))
            .division(division)
            .name("Test Branch")
            .createdAt(OffsetDateTime.parse("2026-03-30T10:15:30+00:00"))
            .updatedAt(OffsetDateTime.parse("2026-03-30T10:15:30+00:00"))
            .build();

    BranchDto dto = mapper.toDto(branch, 3L);

    assertThat(dto.id()).isEqualTo(branch.getId());
    assertThat(dto.divisionId()).isEqualTo(division.getId());
    assertThat(dto.name()).isEqualTo("Test Branch");
    assertThat(dto.objectCount()).isEqualTo(3L);
    assertThat(dto.createdAt()).isEqualTo(branch.getCreatedAt());
    assertThat(dto.updatedAt()).isEqualTo(branch.getUpdatedAt());
  }
}
