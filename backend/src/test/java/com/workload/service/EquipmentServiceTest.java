package com.workload.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.workload.dto.AssignmentCreateRequest;
import com.workload.dto.AssignmentDto;
import com.workload.dto.AssignmentUpdateRequest;
import com.workload.dto.ObjectDeviceDto;
import com.workload.dto.ObjectDeviceUpsertRequest;
import com.workload.entity.DeviceSystemContext;
import com.workload.entity.DeviceType;
import com.workload.entity.ObjectDevice;
import com.workload.entity.ObjectEntity;
import com.workload.entity.ObjectSystemAssignment;
import com.workload.entity.SystemType;
import com.workload.exception.DeviceInUseException;
import com.workload.exception.DeviceNotInInventoryException;
import com.workload.exception.NoContextForSystemException;
import com.workload.exception.ObjectNotFoundException;
import com.workload.mapper.EquipmentMapper;
import com.workload.repository.DeviceSystemContextRepository;
import com.workload.repository.DeviceTypeRepository;
import com.workload.repository.ObjectDeviceRepository;
import com.workload.repository.ObjectRepository;
import com.workload.repository.ObjectSystemAssignmentRepository;
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
class EquipmentServiceTest {

  @Mock private ObjectRepository objectRepository;
  @Mock private ObjectDeviceRepository objectDeviceRepository;
  @Mock private ObjectSystemAssignmentRepository assignmentRepository;
  @Mock private DeviceTypeRepository deviceTypeRepository;
  @Mock private DeviceSystemContextRepository contextRepository;
  @Mock private EquipmentMapper equipmentMapper;

  @InjectMocks private EquipmentService equipmentService;

  private final UUID objectId = UUID.randomUUID();
  private final UUID deviceTypeId = UUID.randomUUID();

  @Test
  void getDevicesReturnsListForObject() {
    ObjectDevice device = ObjectDevice.builder().id(UUID.randomUUID()).build();
    when(objectRepository.existsById(objectId)).thenReturn(true);
    when(objectDeviceRepository.findAllByObjectId(objectId)).thenReturn(List.of(device));
    ObjectDeviceDto dto =
        new ObjectDeviceDto(device.getId(), objectId, deviceTypeId, "Dev", BigDecimal.ONE);
    when(equipmentMapper.toDeviceDto(device)).thenReturn(dto);

    List<ObjectDeviceDto> result = equipmentService.getDevices(objectId);

    assertThat(result).hasSize(1);
  }

  @Test
  void getDevicesThrowsWhenObjectMissing() {
    when(objectRepository.existsById(objectId)).thenReturn(false);

    assertThatThrownBy(() -> equipmentService.getDevices(objectId))
        .isInstanceOf(ObjectNotFoundException.class);
  }

  @Test
  void upsertDeviceCreatesNew() {
    ObjectEntity object = ObjectEntity.builder().id(objectId).build();
    DeviceType dt = DeviceType.builder().id(deviceTypeId).name("Dev").build();
    when(objectRepository.findById(objectId)).thenReturn(Optional.of(object));
    when(deviceTypeRepository.findById(deviceTypeId)).thenReturn(Optional.of(dt));
    when(objectDeviceRepository.findByObjectIdAndDeviceTypeId(objectId, deviceTypeId))
        .thenReturn(Optional.empty());
    when(objectDeviceRepository.save(any(ObjectDevice.class)))
        .thenAnswer(inv -> inv.getArgument(0));
    ObjectDeviceDto dto =
        new ObjectDeviceDto(UUID.randomUUID(), objectId, deviceTypeId, "Dev", BigDecimal.TEN);
    when(equipmentMapper.toDeviceDto(any(ObjectDevice.class))).thenReturn(dto);

    ObjectDeviceDto result =
        equipmentService.upsertDevice(
            objectId, new ObjectDeviceUpsertRequest(deviceTypeId, BigDecimal.TEN));

    assertThat(result.quantityPhysical()).isEqualByComparingTo(BigDecimal.TEN);
    verify(objectDeviceRepository).save(any(ObjectDevice.class));
  }

  @Test
  void addAssignmentVerifiesInventoryPresence() {
    ObjectEntity object = ObjectEntity.builder().id(objectId).build();
    when(objectRepository.findById(objectId)).thenReturn(Optional.of(object));
    when(objectDeviceRepository.findByObjectIdAndDeviceTypeId(objectId, deviceTypeId))
        .thenReturn(Optional.empty());

    assertThatThrownBy(
            () ->
                equipmentService.addAssignment(
                    objectId,
                    new AssignmentCreateRequest(deviceTypeId, SystemType.OS, BigDecimal.ONE)))
        .isInstanceOf(DeviceNotInInventoryException.class);
  }

  @Test
  void addAssignmentVerifiesContextPresence() {
    ObjectEntity object = ObjectEntity.builder().id(objectId).build();
    DeviceType dt = DeviceType.builder().id(deviceTypeId).name("Dev").build();
    ObjectDevice od =
        ObjectDevice.builder().id(UUID.randomUUID()).object(object).deviceType(dt).build();
    when(objectRepository.findById(objectId)).thenReturn(Optional.of(object));
    when(objectDeviceRepository.findByObjectIdAndDeviceTypeId(objectId, deviceTypeId))
        .thenReturn(Optional.of(od));
    when(contextRepository.findByDeviceTypeIdAndSystemType(deviceTypeId, SystemType.OS))
        .thenReturn(Optional.empty());

    assertThatThrownBy(
            () ->
                equipmentService.addAssignment(
                    objectId,
                    new AssignmentCreateRequest(deviceTypeId, SystemType.OS, BigDecimal.ONE)))
        .isInstanceOf(NoContextForSystemException.class);
  }

  @Test
  void addAssignmentSucceeds() {
    ObjectEntity object = ObjectEntity.builder().id(objectId).build();
    DeviceType dt = DeviceType.builder().id(deviceTypeId).name("Dev").build();
    ObjectDevice od =
        ObjectDevice.builder().id(UUID.randomUUID()).object(object).deviceType(dt).build();
    DeviceSystemContext ctx =
        DeviceSystemContext.builder()
            .id(UUID.randomUUID())
            .deviceType(dt)
            .systemType(SystemType.OS)
            .build();
    when(objectRepository.findById(objectId)).thenReturn(Optional.of(object));
    when(objectDeviceRepository.findByObjectIdAndDeviceTypeId(objectId, deviceTypeId))
        .thenReturn(Optional.of(od));
    when(contextRepository.findByDeviceTypeIdAndSystemType(deviceTypeId, SystemType.OS))
        .thenReturn(Optional.of(ctx));
    when(assignmentRepository.findByObjectIdAndDeviceTypeIdAndSystemType(
            objectId, deviceTypeId, SystemType.OS))
        .thenReturn(Optional.empty());
    when(assignmentRepository.save(any(ObjectSystemAssignment.class)))
        .thenAnswer(inv -> inv.getArgument(0));
    AssignmentDto dto =
        new AssignmentDto(
            UUID.randomUUID(),
            objectId,
            deviceTypeId,
            "Dev",
            SystemType.OS,
            BigDecimal.ONE,
            ctx.getId());
    when(equipmentMapper.toAssignmentDto(any(ObjectSystemAssignment.class))).thenReturn(dto);

    AssignmentDto result =
        equipmentService.addAssignment(
            objectId, new AssignmentCreateRequest(deviceTypeId, SystemType.OS, BigDecimal.ONE));

    assertThat(result).isNotNull();
    verify(assignmentRepository).save(any(ObjectSystemAssignment.class));
  }

  @Test
  void updateAssignmentUpdatesQuantity() {
    ObjectSystemAssignment assignment =
        ObjectSystemAssignment.builder()
            .id(UUID.randomUUID())
            .quantityMaintained(BigDecimal.ONE)
            .updatedAt(OffsetDateTime.now())
            .build();
    when(assignmentRepository.findById(assignment.getId())).thenReturn(Optional.of(assignment));
    when(assignmentRepository.save(any(ObjectSystemAssignment.class)))
        .thenAnswer(inv -> inv.getArgument(0));
    AssignmentDto dto =
        new AssignmentDto(
            assignment.getId(),
            objectId,
            deviceTypeId,
            "Dev",
            SystemType.OS,
            BigDecimal.TEN,
            UUID.randomUUID());
    when(equipmentMapper.toAssignmentDto(any(ObjectSystemAssignment.class))).thenReturn(dto);

    AssignmentDto result =
        equipmentService.updateAssignment(
            assignment.getId(), new AssignmentUpdateRequest(BigDecimal.TEN));

    assertThat(result.quantityMaintained()).isEqualByComparingTo(BigDecimal.TEN);
  }

  @Test
  void deleteAssignmentRemoves() {
    UUID assignmentId = UUID.randomUUID();
    when(assignmentRepository.existsById(assignmentId)).thenReturn(true);

    equipmentService.deleteAssignment(assignmentId);

    verify(assignmentRepository).deleteById(assignmentId);
  }

  @Test
  void deleteDeviceThrowsWhenAssignmentsExist() {
    when(assignmentRepository.existsByObjectIdAndDeviceTypeId(objectId, deviceTypeId))
        .thenReturn(true);

    assertThatThrownBy(() -> equipmentService.deleteDevice(objectId, deviceTypeId))
        .isInstanceOf(DeviceInUseException.class);
  }

  @Test
  void deleteDeviceSucceedsWhenNoAssignmentsExist() {
    when(assignmentRepository.existsByObjectIdAndDeviceTypeId(objectId, deviceTypeId))
        .thenReturn(false);

    equipmentService.deleteDevice(objectId, deviceTypeId);

    verify(objectDeviceRepository).deleteByObjectIdAndDeviceTypeId(objectId, deviceTypeId);
  }
}
