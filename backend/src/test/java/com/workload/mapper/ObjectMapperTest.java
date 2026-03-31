package com.workload.mapper;

import static org.assertj.core.api.Assertions.assertThat;

import com.workload.dto.ObjectDto;
import com.workload.entity.Branch;
import com.workload.entity.Division;
import com.workload.entity.ObjectEntity;
import java.time.OffsetDateTime;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.mapstruct.factory.Mappers;

class ObjectMapperTest {

  private final ObjectMapper mapper = Mappers.getMapper(ObjectMapper.class);

  @Test
  void mapsObjectEntityToDto() {
    Division division =
        Division.builder()
            .id(UUID.fromString("22222222-2222-2222-2222-222222222222"))
            .name("Div")
            .createdAt(OffsetDateTime.now())
            .updatedAt(OffsetDateTime.now())
            .build();

    Branch branch =
        Branch.builder()
            .id(UUID.fromString("33333333-3333-3333-3333-333333333333"))
            .division(division)
            .name("Branch")
            .createdAt(OffsetDateTime.now())
            .updatedAt(OffsetDateTime.now())
            .build();

    ObjectEntity entity =
        ObjectEntity.builder()
            .id(UUID.fromString("44444444-4444-4444-4444-444444444444"))
            .branch(branch)
            .name("Test Object")
            .importSeqNo(7)
            .createdAt(OffsetDateTime.parse("2026-03-30T12:00:00+00:00"))
            .updatedAt(OffsetDateTime.parse("2026-03-30T12:00:00+00:00"))
            .build();

    ObjectDto dto = mapper.toDto(entity);

    assertThat(dto.id()).isEqualTo(entity.getId());
    assertThat(dto.branchId()).isEqualTo(branch.getId());
    assertThat(dto.divisionId()).isEqualTo(division.getId());
    assertThat(dto.name()).isEqualTo("Test Object");
    assertThat(dto.importSeqNo()).isEqualTo(7);
    assertThat(dto.createdAt()).isEqualTo(entity.getCreatedAt());
    assertThat(dto.updatedAt()).isEqualTo(entity.getUpdatedAt());
  }

  @Test
  void mapsObjectWithNullImportSeqNo() {
    Division division =
        Division.builder()
            .id(UUID.randomUUID())
            .name("Div")
            .createdAt(OffsetDateTime.now())
            .updatedAt(OffsetDateTime.now())
            .build();

    Branch branch =
        Branch.builder()
            .id(UUID.randomUUID())
            .division(division)
            .name("Branch")
            .createdAt(OffsetDateTime.now())
            .updatedAt(OffsetDateTime.now())
            .build();

    ObjectEntity entity =
        ObjectEntity.builder()
            .id(UUID.randomUUID())
            .branch(branch)
            .name("No SeqNo")
            .importSeqNo(null)
            .createdAt(OffsetDateTime.now())
            .updatedAt(OffsetDateTime.now())
            .build();

    ObjectDto dto = mapper.toDto(entity);

    assertThat(dto.importSeqNo()).isNull();
  }
}
