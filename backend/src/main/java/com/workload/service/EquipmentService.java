package com.workload.service;

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
import com.workload.exception.DeviceNotInInventoryException;
import com.workload.exception.EntityNotFoundException;
import com.workload.exception.NoContextForSystemException;
import com.workload.exception.ObjectNotFoundException;
import com.workload.mapper.EquipmentMapper;
import com.workload.repository.DeviceSystemContextRepository;
import com.workload.repository.DeviceTypeRepository;
import com.workload.repository.ObjectDeviceRepository;
import com.workload.repository.ObjectRepository;
import com.workload.repository.ObjectSystemAssignmentRepository;
import com.workload.service.calculation.CalculationService;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class EquipmentService {

  private final ObjectRepository objectRepository;
  private final ObjectDeviceRepository objectDeviceRepository;
  private final ObjectSystemAssignmentRepository assignmentRepository;
  private final DeviceTypeRepository deviceTypeRepository;
  private final DeviceSystemContextRepository contextRepository;
  private final EquipmentMapper equipmentMapper;
  private final CalculationService calculationService;

  public EquipmentService(
      ObjectRepository objectRepository,
      ObjectDeviceRepository objectDeviceRepository,
      ObjectSystemAssignmentRepository assignmentRepository,
      DeviceTypeRepository deviceTypeRepository,
      DeviceSystemContextRepository contextRepository,
      EquipmentMapper equipmentMapper,
      CalculationService calculationService) {
    this.objectRepository = objectRepository;
    this.objectDeviceRepository = objectDeviceRepository;
    this.assignmentRepository = assignmentRepository;
    this.deviceTypeRepository = deviceTypeRepository;
    this.contextRepository = contextRepository;
    this.equipmentMapper = equipmentMapper;
    this.calculationService = calculationService;
  }

  public List<ObjectDeviceDto> getDevices(UUID objectId) {
    requireObject(objectId);
    return objectDeviceRepository.findAllByObjectId(objectId).stream()
        .map(equipmentMapper::toDeviceDto)
        .toList();
  }

  @Transactional
  public ObjectDeviceDto upsertDevice(UUID objectId, ObjectDeviceUpsertRequest request) {
    ObjectEntity object = findObject(objectId);
    DeviceType deviceType =
        deviceTypeRepository
            .findById(request.deviceTypeId())
            .orElseThrow(
                () -> new EntityNotFoundException("DeviceType", request.deviceTypeId().toString()));

    ObjectDevice device =
        objectDeviceRepository
            .findByObjectIdAndDeviceTypeId(objectId, request.deviceTypeId())
            .orElseGet(
                () ->
                    ObjectDevice.builder()
                        .id(UUID.randomUUID())
                        .object(object)
                        .deviceType(deviceType)
                        .build());

    device.setQuantityPhysical(request.quantityPhysical());
    device.setUpdatedAt(OffsetDateTime.now());
    device = objectDeviceRepository.save(device);
    // PoC (S-02): recalculates synchronously. Replaced by background worker in MVP M-06.
    calculationService.recalculate(objectId);
    return equipmentMapper.toDeviceDto(device);
  }

  @Transactional
  public ObjectDeviceDto upsertDevice(
      UUID objectId, UUID deviceTypeId, ObjectDeviceUpsertRequest request) {
    ObjectEntity object = findObject(objectId);
    DeviceType deviceType =
        deviceTypeRepository
            .findById(deviceTypeId)
            .orElseThrow(() -> new EntityNotFoundException("DeviceType", deviceTypeId.toString()));

    ObjectDevice device =
        objectDeviceRepository
            .findByObjectIdAndDeviceTypeId(objectId, deviceTypeId)
            .orElseGet(
                () ->
                    ObjectDevice.builder()
                        .id(UUID.randomUUID())
                        .object(object)
                        .deviceType(deviceType)
                        .build());

    device.setQuantityPhysical(request.quantityPhysical());
    device.setUpdatedAt(OffsetDateTime.now());
    device = objectDeviceRepository.save(device);
    // PoC (S-02): recalculates synchronously. Replaced by background worker in MVP M-06.
    calculationService.recalculate(objectId);
    return equipmentMapper.toDeviceDto(device);
  }

  @Transactional
  public void deleteDevice(UUID objectId, UUID deviceTypeId) {
    requireObject(objectId);
    // TOR §7.3: cascade-delete all system assignments before removing the device
    assignmentRepository.deleteAllByObjectIdAndDeviceTypeId(objectId, deviceTypeId);
    objectDeviceRepository.deleteByObjectIdAndDeviceTypeId(objectId, deviceTypeId);
    // PoC (S-02): recalculates synchronously. Replaced by background worker in MVP M-06.
    calculationService.recalculate(objectId);
  }

  public List<AssignmentDto> getAssignments(UUID objectId) {
    requireObject(objectId);
    return assignmentRepository.findAllByObjectId(objectId).stream()
        .map(equipmentMapper::toAssignmentDto)
        .toList();
  }

  @Transactional
  public AssignmentDto addAssignment(UUID objectId, AssignmentCreateRequest request) {
    ObjectEntity object = findObject(objectId);

    ObjectDevice inventoryDevice =
        objectDeviceRepository
            .findByObjectIdAndDeviceTypeId(objectId, request.deviceTypeId())
            .orElseThrow(
                () -> new DeviceNotInInventoryException(request.deviceTypeId().toString()));

    DeviceSystemContext context =
        contextRepository
            .findByDeviceTypeIdAndSystemType(request.deviceTypeId(), request.systemType())
            .orElseThrow(() -> new NoContextForSystemException(request.systemType().name()));

    // Check for existing assignment — upsert
    ObjectSystemAssignment assignment =
        assignmentRepository
            .findByObjectIdAndDeviceTypeIdAndSystemType(
                objectId, request.deviceTypeId(), request.systemType())
            .orElseGet(
                () ->
                    ObjectSystemAssignment.builder()
                        .id(UUID.randomUUID())
                        .object(object)
                        .deviceType(inventoryDevice.getDeviceType())
                        .systemType(request.systemType())
                        .context(context)
                        .build());

    assignment.setQuantityMaintained(request.quantityMaintained());
    assignment.setUpdatedAt(OffsetDateTime.now());
    assignment = assignmentRepository.save(assignment);
    // PoC (S-02): recalculates synchronously. Replaced by background worker in MVP M-06.
    calculationService.recalculate(objectId);
    return equipmentMapper.toAssignmentDto(assignment);
  }

  @Transactional
  public AssignmentDto updateAssignment(
      UUID objectId, UUID assignmentId, AssignmentUpdateRequest request) {
    ObjectSystemAssignment assignment =
        assignmentRepository
            .findById(assignmentId)
            .orElseThrow(() -> new EntityNotFoundException("Assignment", assignmentId.toString()));
    if (!assignment.getObject().getId().equals(objectId)) {
      throw new EntityNotFoundException("Assignment", assignmentId.toString());
    }
    assignment.setQuantityMaintained(request.quantityMaintained());
    assignment.setUpdatedAt(OffsetDateTime.now());
    assignment = assignmentRepository.save(assignment);
    // PoC (S-02): recalculates synchronously. Replaced by background worker in MVP M-06.
    calculationService.recalculate(objectId);
    return equipmentMapper.toAssignmentDto(assignment);
  }

  @Transactional
  public void deleteAssignment(UUID objectId, UUID assignmentId) {
    ObjectSystemAssignment assignment =
        assignmentRepository
            .findById(assignmentId)
            .orElseThrow(() -> new EntityNotFoundException("Assignment", assignmentId.toString()));
    if (!assignment.getObject().getId().equals(objectId)) {
      throw new EntityNotFoundException("Assignment", assignmentId.toString());
    }
    assignmentRepository.deleteById(assignmentId);
    // PoC (S-02): recalculates synchronously. Replaced by background worker in MVP M-06.
    calculationService.recalculate(objectId);
  }

  private ObjectEntity findObject(UUID objectId) {
    return objectRepository
        .findById(objectId)
        .orElseThrow(() -> new ObjectNotFoundException(objectId.toString()));
  }

  private void requireObject(UUID objectId) {
    if (!objectRepository.existsById(objectId)) {
      throw new ObjectNotFoundException(objectId.toString());
    }
  }
}
