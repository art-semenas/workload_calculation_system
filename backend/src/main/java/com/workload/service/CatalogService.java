package com.workload.service;

import com.workload.dto.DeviceSystemContextDto;
import com.workload.dto.DeviceTypeDto;
import com.workload.dto.RepairTypeDto;
import com.workload.entity.DeviceSystemContext;
import com.workload.entity.DeviceType;
import com.workload.exception.EntityNotFoundException;
import com.workload.mapper.CatalogMapper;
import com.workload.repository.DeviceSystemContextRepository;
import com.workload.repository.DeviceTypeRepository;
import com.workload.repository.RepairTypeRepository;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;

@Service
public class CatalogService {

  private final DeviceTypeRepository deviceTypeRepository;
  private final DeviceSystemContextRepository contextRepository;
  private final RepairTypeRepository repairTypeRepository;
  private final CatalogMapper catalogMapper;

  public CatalogService(
      DeviceTypeRepository deviceTypeRepository,
      DeviceSystemContextRepository contextRepository,
      RepairTypeRepository repairTypeRepository,
      CatalogMapper catalogMapper) {
    this.deviceTypeRepository = deviceTypeRepository;
    this.contextRepository = contextRepository;
    this.repairTypeRepository = repairTypeRepository;
    this.catalogMapper = catalogMapper;
  }

  public List<DeviceTypeDto> getAllDeviceTypes() {
    return deviceTypeRepository.findAll().stream()
        .map(
            dt -> {
              List<DeviceSystemContext> contexts =
                  contextRepository.findAllByDeviceTypeId(dt.getId());
              return catalogMapper.toDeviceTypeDto(dt, contexts);
            })
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
}
