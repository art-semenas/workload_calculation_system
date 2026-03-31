package com.workload.mapper;

import static org.assertj.core.api.Assertions.assertThat;

import com.workload.dto.DivisionDto;
import com.workload.entity.Division;
import java.time.OffsetDateTime;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.mapstruct.factory.Mappers;

class DivisionMapperTest {

  private final DivisionMapper mapper = Mappers.getMapper(DivisionMapper.class);

  @Test
  void mapsDivisionToDto() {
    Division division =
        Division.builder()
            .id(UUID.fromString("11111111-1111-1111-1111-111111111111"))
            .name("Brest Division")
            .createdAt(OffsetDateTime.parse("2026-03-30T10:15:30+00:00"))
            .updatedAt(OffsetDateTime.parse("2026-03-30T10:15:30+00:00"))
            .build();

    DivisionDto dto = mapper.toDto(division, 2L, 5L);

    assertThat(dto.id()).isEqualTo(division.getId());
    assertThat(dto.name()).isEqualTo("Brest Division");
    assertThat(dto.branchCount()).isEqualTo(2L);
    assertThat(dto.objectCount()).isEqualTo(5L);
  }
}
