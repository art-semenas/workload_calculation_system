package com.workload.service;

import com.workload.dto.RecordsDto;
import com.workload.dto.RecordsUpdateRequest;
import com.workload.entity.ObjectEntity;
import com.workload.entity.RecordsTask;
import com.workload.exception.ObjectNotFoundException;
import com.workload.mapper.EquipmentMapper;
import com.workload.repository.ObjectRepository;
import com.workload.repository.RecordsTaskRepository;
import com.workload.service.calculation.CalculationService;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;
import org.springframework.stereotype.Service;

@Service
public class RecordsService {

  private final RecordsTaskRepository recordsTaskRepository;
  private final ObjectRepository objectRepository;
  private final EquipmentMapper equipmentMapper;
  private final CalculationService calculationService;

  public RecordsService(
      RecordsTaskRepository recordsTaskRepository,
      ObjectRepository objectRepository,
      EquipmentMapper equipmentMapper,
      CalculationService calculationService) {
    this.recordsTaskRepository = recordsTaskRepository;
    this.objectRepository = objectRepository;
    this.equipmentMapper = equipmentMapper;
    this.calculationService = calculationService;
  }

  public RecordsDto get(UUID objectId) {
    requireObject(objectId);
    return recordsTaskRepository
        .findByObjectId(objectId)
        .map(equipmentMapper::toRecordsDto)
        .orElse(
            new RecordsDto(
                null,
                objectId,
                BigDecimal.ZERO,
                BigDecimal.ZERO,
                BigDecimal.ZERO,
                BigDecimal.ZERO,
                BigDecimal.ZERO));
  }

  public RecordsDto update(UUID objectId, RecordsUpdateRequest request) {
    ObjectEntity object = findObject(objectId);
    RecordsTask task =
        recordsTaskRepository
            .findByObjectId(objectId)
            .orElseGet(() -> RecordsTask.builder().id(UUID.randomUUID()).object(object).build());

    task.setAccessRequests(
        request.accessRequests() != null ? request.accessRequests() : BigDecimal.ZERO);
    task.setMonitoringRequests(
        request.monitoringRequests() != null ? request.monitoringRequests() : BigDecimal.ZERO);
    task.setFootageRequests(
        request.footageRequests() != null ? request.footageRequests() : BigDecimal.ZERO);
    task.setBackupControl(
        request.backupControl() != null ? request.backupControl() : BigDecimal.ZERO);
    task.setSecurityAdmin(
        request.securityAdmin() != null ? request.securityAdmin() : BigDecimal.ZERO);
    task.setUpdatedAt(OffsetDateTime.now());
    task = recordsTaskRepository.save(task);
    // PoC (S-02): synchronous recalculation after records change
    calculationService.recalculate(objectId);
    return equipmentMapper.toRecordsDto(task);
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
