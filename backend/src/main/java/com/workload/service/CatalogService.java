package com.workload.service;

import com.workload.dto.DeviceSystemContextCreateRequest;
import com.workload.dto.DeviceSystemContextDto;
import com.workload.dto.DeviceSystemContextUpdateRequest;
import com.workload.dto.DeviceTypeCreateRequest;
import com.workload.dto.DeviceTypeDto;
import com.workload.dto.DeviceTypeUpdateRequest;
import com.workload.dto.RepairTypeCreateRequest;
import com.workload.dto.RepairTypeDto;
import com.workload.dto.RepairTypeUpdateRequest;
import com.workload.entity.DeviceSystemContext;
import com.workload.entity.DeviceType;
import com.workload.entity.RepairType;
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
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;

@Service
public class CatalogService {

  private final DeviceTypeRepository deviceTypeRepository;
  private final DeviceSystemContextRepository contextRepository;
  private final RepairTypeRepository repairTypeRepository;
  private final CatalogMapper catalogMapper;
  private final ObjectDeviceRepository objectDeviceRepository;
  private final ObjectSystemAssignmentRepository assignmentRepository;
  private final ObjectRepairRepository objectRepairRepository;

  public CatalogService(
      DeviceTypeRepository deviceTypeRepository,
      DeviceSystemContextRepository contextRepository,
      RepairTypeRepository repairTypeRepository,
      CatalogMapper catalogMapper,
      ObjectDeviceRepository objectDeviceRepository,
      ObjectSystemAssignmentRepository assignmentRepository,
      ObjectRepairRepository objectRepairRepository) {
    this.deviceTypeRepository = deviceTypeRepository;
    this.contextRepository = contextRepository;
    this.repairTypeRepository = repairTypeRepository;
    this.catalogMapper = catalogMapper;
    this.objectDeviceRepository = objectDeviceRepository;
    this.assignmentRepository = assignmentRepository;
    this.objectRepairRepository = objectRepairRepository;
  }

  public List<DeviceTypeDto> getAllDeviceTypes() {
    List<DeviceType> deviceTypes = deviceTypeRepository.findAll();
    Map<UUID, List<DeviceSystemContext>> contextsByDeviceType =
        contextRepository.findAll().stream()
            .collect(Collectors.groupingBy(ctx -> ctx.getDeviceType().getId()));
    return deviceTypes.stream()
        .map(
            dt ->
                catalogMapper.toDeviceTypeDto(
                    dt, contextsByDeviceType.getOrDefault(dt.getId(), List.of())))
        .toList();
  }

  public DeviceTypeDto getDeviceType(UUID id) {
    DeviceType dt =
        deviceTypeRepository
            .findById(id)
            .orElseThrow(() -> new EntityNotFoundException("DeviceType", id.toString()));
    List<DeviceSystemContext> contexts = contextRepository.findAllByDeviceTypeId(id);
    return catalogMapper.toDeviceTypeDto(dt, contexts);
  }

  public List<DeviceSystemContextDto> getContextsForDevice(UUID deviceTypeId) {
    return contextRepository.findAllByDeviceTypeId(deviceTypeId).stream()
        .map(catalogMapper::toContextDto)
        .toList();
  }

  public List<RepairTypeDto> getAllRepairTypes() {
    return repairTypeRepository.findAll().stream().map(catalogMapper::toRepairTypeDto).toList();
  }

  public DeviceTypeDto createDeviceType(DeviceTypeCreateRequest request) {
    DeviceType dt =
        DeviceType.builder()
            .id(UUID.randomUUID())
            .name(request.name())
            .description(request.description())
            .createdAt(OffsetDateTime.now())
            .updatedAt(OffsetDateTime.now())
            .build();
    dt = deviceTypeRepository.save(dt);
    List<DeviceSystemContext> contexts = contextRepository.findAllByDeviceTypeId(dt.getId());
    return catalogMapper.toDeviceTypeDto(dt, contexts);
  }

  public DeviceTypeDto updateDeviceType(UUID id, DeviceTypeUpdateRequest request) {
    DeviceType dt =
        deviceTypeRepository
            .findById(id)
            .orElseThrow(() -> new EntityNotFoundException("DeviceType", id.toString()));
    dt.setName(request.name());
    dt.setDescription(request.description());
    dt.setUpdatedAt(OffsetDateTime.now());
    dt = deviceTypeRepository.save(dt);
    List<DeviceSystemContext> contexts = contextRepository.findAllByDeviceTypeId(dt.getId());
    return catalogMapper.toDeviceTypeDto(dt, contexts);
  }

  public void deleteDeviceType(UUID id) {
    DeviceType dt =
        deviceTypeRepository
            .findById(id)
            .orElseThrow(() -> new EntityNotFoundException("DeviceType", id.toString()));
    if (objectDeviceRepository.existsByDeviceTypeId(id)) {
      throw new DeviceTypeInUseException(id.toString());
    }
    deviceTypeRepository.delete(dt);
  }

  public DeviceSystemContextDto createContext(
      UUID deviceTypeId, DeviceSystemContextCreateRequest request) {
    DeviceType dt =
        deviceTypeRepository
            .findById(deviceTypeId)
            .orElseThrow(() -> new EntityNotFoundException("DeviceType", deviceTypeId.toString()));
    DeviceSystemContext ctx =
        DeviceSystemContext.builder()
            .id(UUID.randomUUID())
            .deviceType(dt)
            .systemType(request.systemType())
            .r1Minutes(request.r1Minutes())
            .r2Minutes(request.r2Minutes())
            .createdAt(OffsetDateTime.now())
            .updatedAt(OffsetDateTime.now())
            .build();
    return catalogMapper.toContextDto(contextRepository.save(ctx));
  }

  public DeviceSystemContextDto updateContext(
      UUID deviceTypeId, UUID contextId, DeviceSystemContextUpdateRequest request) {
    deviceTypeRepository
        .findById(deviceTypeId)
        .orElseThrow(() -> new EntityNotFoundException("DeviceType", deviceTypeId.toString()));
    DeviceSystemContext ctx =
        contextRepository
            .findByIdAndDeviceTypeId(contextId, deviceTypeId)
            .orElseThrow(() -> new EntityNotFoundException("Context", contextId.toString()));
    ctx.setR1Minutes(request.r1Minutes());
    ctx.setR2Minutes(request.r2Minutes());
    ctx.setUpdatedAt(OffsetDateTime.now());
    return catalogMapper.toContextDto(contextRepository.save(ctx));
  }

  public void deleteContext(UUID deviceTypeId, UUID contextId) {
    deviceTypeRepository
        .findById(deviceTypeId)
        .orElseThrow(() -> new EntityNotFoundException("DeviceType", deviceTypeId.toString()));
    DeviceSystemContext ctx =
        contextRepository
            .findByIdAndDeviceTypeId(contextId, deviceTypeId)
            .orElseThrow(() -> new EntityNotFoundException("Context", contextId.toString()));
    long usageCount = assignmentRepository.countByContextId(contextId);
    if (usageCount > 0) {
      throw new ContextInUseException(usageCount);
    }
    contextRepository.delete(ctx);
  }

  public RepairTypeDto createRepairType(RepairTypeCreateRequest request) {
    RepairType rt =
        RepairType.builder()
            .id(UUID.randomUUID())
            .name(request.name())
            .timeMinutes(request.timeMinutes())
            .createdAt(OffsetDateTime.now())
            .updatedAt(OffsetDateTime.now())
            .build();
    return catalogMapper.toRepairTypeDto(repairTypeRepository.save(rt));
  }

  public RepairTypeDto updateRepairType(UUID id, RepairTypeUpdateRequest request) {
    RepairType rt =
        repairTypeRepository
            .findById(id)
            .orElseThrow(() -> new EntityNotFoundException("RepairType", id.toString()));
    rt.setName(request.name());
    rt.setTimeMinutes(request.timeMinutes());
    rt.setUpdatedAt(OffsetDateTime.now());
    return catalogMapper.toRepairTypeDto(repairTypeRepository.save(rt));
  }

  public void deleteRepairType(UUID id) {
    RepairType rt =
        repairTypeRepository
            .findById(id)
            .orElseThrow(() -> new EntityNotFoundException("RepairType", id.toString()));
    if (objectRepairRepository.existsByRepairTypeIdAndCountGreaterThan(id, 0)) {
      throw new RepairTypeInUseException(id.toString());
    }
    repairTypeRepository.delete(rt);
  }
}
