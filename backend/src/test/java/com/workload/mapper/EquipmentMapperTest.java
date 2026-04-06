package com.workload.mapper;

import static org.assertj.core.api.Assertions.assertThat;

import com.workload.dto.ObjectDto;
import com.workload.dto.TravelDto;
import com.workload.entity.Branch;
import com.workload.entity.Division;
import com.workload.entity.ObjectEntity;
import com.workload.entity.Travel;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.mapstruct.factory.Mappers;

class EquipmentMapperTest {

  private final ObjectMapper objectMapper = Mappers.getMapper(ObjectMapper.class);
  private final EquipmentMapper equipmentMapper = Mappers.getMapper(EquipmentMapper.class);

  @Test
  void mapsObjectEntityToDto() {
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
            .name("Test Object")
            .importSeqNo(42)
            .createdAt(OffsetDateTime.now())
            .updatedAt(OffsetDateTime.now())
            .build();

    ObjectDto dto = objectMapper.toDto(entity);

    assertThat(dto.id()).isEqualTo(entity.getId());
    assertThat(dto.branchId()).isEqualTo(branch.getId());
    assertThat(dto.divisionId()).isEqualTo(division.getId());
    assertThat(dto.name()).isEqualTo("Test Object");
    assertThat(dto.importSeqNo()).isEqualTo(42);
  }

  @Test
  void mapsTravelWithComputedRoundTrip() {
    ObjectEntity obj =
        ObjectEntity.builder()
            .id(UUID.randomUUID())
            .branch(
                Branch.builder()
                    .id(UUID.randomUUID())
                    .division(
                        Division.builder()
                            .id(UUID.randomUUID())
                            .name("D")
                            .createdAt(OffsetDateTime.now())
                            .updatedAt(OffsetDateTime.now())
                            .build())
                    .name("B")
                    .createdAt(OffsetDateTime.now())
                    .updatedAt(OffsetDateTime.now())
                    .build())
            .name("O")
            .createdAt(OffsetDateTime.now())
            .updatedAt(OffsetDateTime.now())
            .build();

    Travel travel =
        Travel.builder()
            .id(UUID.randomUUID())
            .object(obj)
            .transportType("car")
            .distanceKm(new BigDecimal("15.00"))
            .oneWayTimeMin(new BigDecimal("30.00"))
            .updatedAt(OffsetDateTime.now())
            .build();

    TravelDto dto = equipmentMapper.toTravelDto(travel);

    assertThat(dto.objectId()).isEqualTo(obj.getId());
    assertThat(dto.oneWayTimeMin()).isEqualByComparingTo("30.00");
    assertThat(dto.roundTripMin()).isEqualByComparingTo("60.00");
  }
}
