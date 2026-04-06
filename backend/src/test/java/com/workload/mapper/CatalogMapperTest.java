package com.workload.mapper;

import static org.assertj.core.api.Assertions.assertThat;

import com.workload.dto.DeviceSystemContextDto;
import com.workload.dto.DeviceTypeDto;
import com.workload.dto.RepairTypeDto;
import com.workload.entity.DeviceSystemContext;
import com.workload.entity.DeviceType;
import com.workload.entity.RepairType;
import com.workload.entity.SystemType;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.mapstruct.factory.Mappers;

class CatalogMapperTest {

  private final CatalogMapper mapper = Mappers.getMapper(CatalogMapper.class);

  @Test
  void mapsDeviceTypeWithContexts() {
    DeviceType deviceType =
        DeviceType.builder()
            .id(UUID.fromString("11111111-1111-1111-1111-111111111111"))
            .name("Камера")
            .description("IP camera")
            .createdAt(OffsetDateTime.now())
            .updatedAt(OffsetDateTime.now())
            .build();

    DeviceSystemContext context =
        DeviceSystemContext.builder()
            .id(UUID.fromString("22222222-2222-2222-2222-222222222222"))
            .deviceType(deviceType)
            .systemType(SystemType.OS)
            .r1Minutes(new BigDecimal("1.2500"))
            .r2Minutes(new BigDecimal("0.7500"))
            .createdAt(OffsetDateTime.now())
            .updatedAt(OffsetDateTime.now())
            .build();

    DeviceTypeDto dto = mapper.toDeviceTypeDto(deviceType, List.of(context));

    assertThat(dto.id()).isEqualTo(deviceType.getId());
    assertThat(dto.name()).isEqualTo("Камера");
    assertThat(dto.description()).isEqualTo("IP camera");
    assertThat(dto.contexts()).hasSize(1);

    DeviceSystemContextDto ctxDto = dto.contexts().get(0);
    assertThat(ctxDto.id()).isEqualTo(context.getId());
    assertThat(ctxDto.deviceTypeId()).isEqualTo(deviceType.getId());
    assertThat(ctxDto.systemType()).isEqualTo(SystemType.OS);
    assertThat(ctxDto.r1Minutes()).isEqualByComparingTo("1.2500");
    assertThat(ctxDto.r2Minutes()).isEqualByComparingTo("0.7500");
  }

  @Test
  void mapsRepairTypeToDto() {
    RepairType repairType =
        RepairType.builder()
            .id(UUID.fromString("33333333-3333-3333-3333-333333333333"))
            .name("ТО-1")
            .timeMinutes(new BigDecimal("45.0000"))
            .createdAt(OffsetDateTime.now())
            .updatedAt(OffsetDateTime.now())
            .build();

    RepairTypeDto dto = mapper.toRepairTypeDto(repairType);

    assertThat(dto.id()).isEqualTo(repairType.getId());
    assertThat(dto.name()).isEqualTo("ТО-1");
    assertThat(dto.timeMinutes()).isEqualByComparingTo("45.0000");
  }

  @Test
  void mapsContextDtoStandalone() {
    DeviceType deviceType =
        DeviceType.builder()
            .id(UUID.randomUUID())
            .name("Датчик")
            .createdAt(OffsetDateTime.now())
            .updatedAt(OffsetDateTime.now())
            .build();

    DeviceSystemContext context =
        DeviceSystemContext.builder()
            .id(UUID.randomUUID())
            .deviceType(deviceType)
            .systemType(SystemType.VIDEO)
            .r1Minutes(new BigDecimal("2.0000"))
            .r2Minutes(new BigDecimal("1.0000"))
            .createdAt(OffsetDateTime.now())
            .updatedAt(OffsetDateTime.now())
            .build();

    DeviceSystemContextDto dto = mapper.toContextDto(context);

    assertThat(dto.deviceTypeId()).isEqualTo(deviceType.getId());
    assertThat(dto.systemType()).isEqualTo(SystemType.VIDEO);
  }
}
