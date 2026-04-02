package com.workload.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.workload.dto.DeviceSystemContextCreateRequest;
import com.workload.dto.DeviceSystemContextDto;
import com.workload.dto.DeviceTypeCreateRequest;
import com.workload.dto.DeviceTypeDto;
import com.workload.dto.DeviceTypeUpdateRequest;
import com.workload.dto.RepairTypeCreateRequest;
import com.workload.dto.RepairTypeDto;
import com.workload.dto.RepairTypeUpdateRequest;
import com.workload.entity.DeviceSystemContext;
import com.workload.entity.DeviceType;
import com.workload.entity.RepairType;
import com.workload.entity.SystemType;
import com.workload.exception.ContextInUseException;
import com.workload.exception.DeviceTypeInUseException;
import com.workload.exception.EntityNotFoundException;
import com.workload.exception.RepairTypeInUseException;
import com.workload.mapper.CatalogMapper;
import com.workload.repository.DeviceSystemContextRepository;
import com.workload.repository.DeviceTypeRepository;
import com.workload.repository.ObjectDeviceRepository;
import com.workload.repository.ObjectRepairRepository;
import com.workload.repository.ObjectSystemAssignmentRepository;
import com.workload.repository.RepairTypeRepository;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class CatalogServiceTest {

  @Mock private DeviceTypeRepository deviceTypeRepository;
  @Mock private DeviceSystemContextRepository contextRepository;
  @Mock private RepairTypeRepository repairTypeRepository;
  @Mock private ObjectDeviceRepository objectDeviceRepository;
  @Mock private ObjectSystemAssignmentRepository assignmentRepository;
  @Mock private ObjectRepairRepository objectRepairRepository;
  @Mock private CatalogMapper catalogMapper;
  @InjectMocks private CatalogService catalogService;

  // ── Device type write tests ───────────────────────────────────────────────

  @Test
  void createDeviceTypeSavesAndReturnsDto() {
    DeviceType saved =
        DeviceType.builder()
            .id(UUID.randomUUID())
            .name("NewType")
            .description("desc")
            .createdAt(OffsetDateTime.now())
            .updatedAt(OffsetDateTime.now())
            .build();

    when(deviceTypeRepository.save(any(DeviceType.class))).thenReturn(saved);
    when(contextRepository.findAllByDeviceTypeId(saved.getId())).thenReturn(List.of());
    when(catalogMapper.toDeviceTypeDto(saved, List.of()))
        .thenReturn(new DeviceTypeDto(saved.getId(), "NewType", "desc", List.of()));

    DeviceTypeDto result =
        catalogService.createDeviceType(new DeviceTypeCreateRequest("NewType", "desc"));

    assertThat(result.name()).isEqualTo("NewType");
    verify(deviceTypeRepository).save(any(DeviceType.class));
  }

  @Test
  void updateDeviceTypeUpdatesAndReturnsDto() {
    UUID id = UUID.randomUUID();
    DeviceType dt =
        DeviceType.builder()
            .id(id)
            .name("Old")
            .createdAt(OffsetDateTime.now())
            .updatedAt(OffsetDateTime.now())
            .build();

    when(deviceTypeRepository.findById(id)).thenReturn(Optional.of(dt));
    when(deviceTypeRepository.save(dt)).thenReturn(dt);
    when(contextRepository.findAllByDeviceTypeId(id)).thenReturn(List.of());
    when(catalogMapper.toDeviceTypeDto(dt, List.of()))
        .thenReturn(new DeviceTypeDto(id, "New", null, List.of()));

    DeviceTypeDto result =
        catalogService.updateDeviceType(id, new DeviceTypeUpdateRequest("New", null));

    assertThat(result.name()).isEqualTo("New");
  }

  @Test
  void updateDeviceTypeThrowsWhenNotFound() {
    UUID id = UUID.randomUUID();
    when(deviceTypeRepository.findById(id)).thenReturn(Optional.empty());

    assertThatThrownBy(
            () -> catalogService.updateDeviceType(id, new DeviceTypeUpdateRequest("X", null)))
        .isInstanceOf(EntityNotFoundException.class);
  }

  @Test
  void deleteDeviceTypeThrowsWhenInUse() {
    UUID id = UUID.randomUUID();
    DeviceType dt =
        DeviceType.builder()
            .id(id)
            .name("X")
            .createdAt(OffsetDateTime.now())
            .updatedAt(OffsetDateTime.now())
            .build();

    when(deviceTypeRepository.findById(id)).thenReturn(Optional.of(dt));
    when(objectDeviceRepository.existsByDeviceTypeId(id)).thenReturn(true);

    assertThatThrownBy(() -> catalogService.deleteDeviceType(id))
        .isInstanceOf(DeviceTypeInUseException.class);
  }

  @Test
  void deleteDeviceTypeSucceedsWhenNotInUse() {
    UUID id = UUID.randomUUID();
    DeviceType dt =
        DeviceType.builder()
            .id(id)
            .name("X")
            .createdAt(OffsetDateTime.now())
            .updatedAt(OffsetDateTime.now())
            .build();

    when(deviceTypeRepository.findById(id)).thenReturn(Optional.of(dt));
    when(objectDeviceRepository.existsByDeviceTypeId(id)).thenReturn(false);

    catalogService.deleteDeviceType(id);

    verify(deviceTypeRepository).delete(dt);
  }

  // ── Context write tests ───────────────────────────────────────────────────

  @Test
  void createContextSavesAndReturnsDto() {
    UUID deviceTypeId = UUID.randomUUID();
    DeviceType dt =
        DeviceType.builder()
            .id(deviceTypeId)
            .name("X")
            .createdAt(OffsetDateTime.now())
            .updatedAt(OffsetDateTime.now())
            .build();
    DeviceSystemContext savedCtx =
        DeviceSystemContext.builder()
            .id(UUID.randomUUID())
            .deviceType(dt)
            .systemType(SystemType.OS)
            .r1Minutes(BigDecimal.ONE)
            .r2Minutes(BigDecimal.ONE)
            .createdAt(OffsetDateTime.now())
            .updatedAt(OffsetDateTime.now())
            .build();
    DeviceSystemContextDto expectedDto =
        new DeviceSystemContextDto(
            savedCtx.getId(), deviceTypeId, SystemType.OS, BigDecimal.ONE, BigDecimal.ONE);

    when(deviceTypeRepository.findById(deviceTypeId)).thenReturn(Optional.of(dt));
    when(contextRepository.save(any(DeviceSystemContext.class))).thenReturn(savedCtx);
    when(catalogMapper.toContextDto(savedCtx)).thenReturn(expectedDto);

    DeviceSystemContextDto result =
        catalogService.createContext(
            deviceTypeId,
            new DeviceSystemContextCreateRequest(SystemType.OS, BigDecimal.ONE, BigDecimal.ONE));

    assertThat(result.systemType()).isEqualTo(SystemType.OS);
    verify(contextRepository).save(any(DeviceSystemContext.class));
  }

  @Test
  void deleteContextThrowsWhenInUse() {
    UUID deviceTypeId = UUID.randomUUID();
    UUID contextId = UUID.randomUUID();
    DeviceType dt =
        DeviceType.builder()
            .id(deviceTypeId)
            .name("X")
            .createdAt(OffsetDateTime.now())
            .updatedAt(OffsetDateTime.now())
            .build();
    DeviceSystemContext ctx =
        DeviceSystemContext.builder()
            .id(contextId)
            .deviceType(dt)
            .systemType(SystemType.OS)
            .r1Minutes(BigDecimal.ONE)
            .r2Minutes(BigDecimal.ONE)
            .createdAt(OffsetDateTime.now())
            .updatedAt(OffsetDateTime.now())
            .build();

    when(deviceTypeRepository.findById(deviceTypeId)).thenReturn(Optional.of(dt));
    when(contextRepository.findById(contextId)).thenReturn(Optional.of(ctx));
    when(assignmentRepository.existsByContextId(contextId)).thenReturn(true);

    assertThatThrownBy(() -> catalogService.deleteContext(deviceTypeId, contextId))
        .isInstanceOf(ContextInUseException.class);
  }

  @Test
  void deleteContextSucceedsWhenNotInUse() {
    UUID deviceTypeId = UUID.randomUUID();
    UUID contextId = UUID.randomUUID();
    DeviceType dt =
        DeviceType.builder()
            .id(deviceTypeId)
            .name("X")
            .createdAt(OffsetDateTime.now())
            .updatedAt(OffsetDateTime.now())
            .build();
    DeviceSystemContext ctx =
        DeviceSystemContext.builder()
            .id(contextId)
            .deviceType(dt)
            .systemType(SystemType.OS)
            .r1Minutes(BigDecimal.ONE)
            .r2Minutes(BigDecimal.ONE)
            .createdAt(OffsetDateTime.now())
            .updatedAt(OffsetDateTime.now())
            .build();

    when(deviceTypeRepository.findById(deviceTypeId)).thenReturn(Optional.of(dt));
    when(contextRepository.findById(contextId)).thenReturn(Optional.of(ctx));
    when(assignmentRepository.existsByContextId(contextId)).thenReturn(false);

    catalogService.deleteContext(deviceTypeId, contextId);

    verify(contextRepository).delete(ctx);
  }

  // ── Repair type write tests ───────────────────────────────────────────────

  @Test
  void createRepairTypeSavesAndReturnsDto() {
    RepairType saved =
        RepairType.builder()
            .id(UUID.randomUUID())
            .name("NewRepair")
            .timeMinutes(new BigDecimal("15"))
            .createdAt(OffsetDateTime.now())
            .updatedAt(OffsetDateTime.now())
            .build();

    when(repairTypeRepository.save(any(RepairType.class))).thenReturn(saved);
    when(catalogMapper.toRepairTypeDto(saved))
        .thenReturn(new RepairTypeDto(saved.getId(), "NewRepair", new BigDecimal("15")));

    RepairTypeDto result =
        catalogService.createRepairType(
            new RepairTypeCreateRequest("NewRepair", new BigDecimal("15")));

    assertThat(result.name()).isEqualTo("NewRepair");
    verify(repairTypeRepository).save(any(RepairType.class));
  }

  @Test
  void updateRepairTypeUpdatesAndReturnsDto() {
    UUID id = UUID.randomUUID();
    RepairType rt =
        RepairType.builder()
            .id(id)
            .name("Old")
            .timeMinutes(BigDecimal.ONE)
            .createdAt(OffsetDateTime.now())
            .updatedAt(OffsetDateTime.now())
            .build();

    when(repairTypeRepository.findById(id)).thenReturn(Optional.of(rt));
    when(repairTypeRepository.save(rt)).thenReturn(rt);
    when(catalogMapper.toRepairTypeDto(rt))
        .thenReturn(new RepairTypeDto(id, "Updated", new BigDecimal("20")));

    RepairTypeDto result =
        catalogService.updateRepairType(
            id, new RepairTypeUpdateRequest("Updated", new BigDecimal("20")));

    assertThat(result.name()).isEqualTo("Updated");
  }

  @Test
  void deleteRepairTypeThrowsWhenCountGreaterThanZero() {
    UUID id = UUID.randomUUID();
    RepairType rt =
        RepairType.builder()
            .id(id)
            .name("X")
            .timeMinutes(BigDecimal.ONE)
            .createdAt(OffsetDateTime.now())
            .updatedAt(OffsetDateTime.now())
            .build();

    when(repairTypeRepository.findById(id)).thenReturn(Optional.of(rt));
    when(objectRepairRepository.existsByRepairTypeIdAndCountGreaterThan(id, 0)).thenReturn(true);

    assertThatThrownBy(() -> catalogService.deleteRepairType(id))
        .isInstanceOf(RepairTypeInUseException.class);
  }

  @Test
  void deleteRepairTypeSucceedsWhenAllCountsAreZero() {
    UUID id = UUID.randomUUID();
    RepairType rt =
        RepairType.builder()
            .id(id)
            .name("X")
            .timeMinutes(BigDecimal.ONE)
            .createdAt(OffsetDateTime.now())
            .updatedAt(OffsetDateTime.now())
            .build();

    when(repairTypeRepository.findById(id)).thenReturn(Optional.of(rt));
    when(objectRepairRepository.existsByRepairTypeIdAndCountGreaterThan(id, 0)).thenReturn(false);

    catalogService.deleteRepairType(id);

    verify(repairTypeRepository).delete(rt);
  }
}
