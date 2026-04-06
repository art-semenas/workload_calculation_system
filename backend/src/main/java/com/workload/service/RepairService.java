package com.workload.service;

import com.workload.dto.RepairDto;
import com.workload.dto.RepairUpdateRequest;
import com.workload.entity.ObjectEntity;
import com.workload.entity.ObjectRepair;
import com.workload.entity.RepairType;
import com.workload.exception.EntityNotFoundException;
import com.workload.exception.ObjectNotFoundException;
import com.workload.mapper.EquipmentMapper;
import com.workload.repository.ObjectRepairRepository;
import com.workload.repository.ObjectRepository;
import com.workload.repository.RepairTypeRepository;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;

@Service
public class RepairService {

  private final ObjectRepairRepository repairRepository;
  private final ObjectRepository objectRepository;
  private final RepairTypeRepository repairTypeRepository;
  private final EquipmentMapper equipmentMapper;

  public RepairService(
      ObjectRepairRepository repairRepository,
      ObjectRepository objectRepository,
      RepairTypeRepository repairTypeRepository,
      EquipmentMapper equipmentMapper) {
    this.repairRepository = repairRepository;
    this.objectRepository = objectRepository;
    this.repairTypeRepository = repairTypeRepository;
    this.equipmentMapper = equipmentMapper;
  }

  public List<RepairDto> getAll(UUID objectId) {
    requireObject(objectId);
    return repairRepository.findAllByObjectId(objectId).stream()
        .map(equipmentMapper::toRepairDto)
        .toList();
  }

  public RepairDto update(UUID objectId, UUID repairTypeId, RepairUpdateRequest request) {
    ObjectEntity object = findObject(objectId);
    RepairType repairType =
        repairTypeRepository
            .findById(repairTypeId)
            .orElseThrow(() -> new EntityNotFoundException("RepairType", repairTypeId.toString()));

    ObjectRepair repair =
        repairRepository
            .findByObjectIdAndRepairTypeId(objectId, repairTypeId)
            .orElseGet(
                () ->
                    ObjectRepair.builder()
                        .id(UUID.randomUUID())
                        .object(object)
                        .repairType(repairType)
                        .build());

    repair.setCount(request.count());
    repair.setUpdatedAt(OffsetDateTime.now());
    repair = repairRepository.save(repair);
    return equipmentMapper.toRepairDto(repair);
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
