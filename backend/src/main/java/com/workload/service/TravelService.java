package com.workload.service;

import com.workload.dto.TravelDto;
import com.workload.dto.TravelUpdateRequest;
import com.workload.entity.ObjectEntity;
import com.workload.entity.Travel;
import com.workload.exception.ObjectNotFoundException;
import com.workload.mapper.EquipmentMapper;
import com.workload.repository.ObjectRepository;
import com.workload.repository.TravelRepository;
import com.workload.service.calculation.CalculationService;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class TravelService {

  private final TravelRepository travelRepository;
  private final ObjectRepository objectRepository;
  private final EquipmentMapper equipmentMapper;
  private final CalculationService calculationService;

  public TravelService(
      TravelRepository travelRepository,
      ObjectRepository objectRepository,
      EquipmentMapper equipmentMapper,
      CalculationService calculationService) {
    this.travelRepository = travelRepository;
    this.objectRepository = objectRepository;
    this.equipmentMapper = equipmentMapper;
    this.calculationService = calculationService;
  }

  public TravelDto get(UUID objectId) {
    requireObject(objectId);
    return travelRepository
        .findByObjectId(objectId)
        .map(equipmentMapper::toTravelDto)
        .orElse(
            new TravelDto(null, objectId, null, BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO));
  }

  @Transactional
  public TravelDto update(UUID objectId, TravelUpdateRequest request) {
    ObjectEntity object = findObject(objectId);
    Travel travel =
        travelRepository
            .findByObjectId(objectId)
            .orElseGet(() -> Travel.builder().id(UUID.randomUUID()).object(object).build());

    travel.setTransportType(request.transportType());
    travel.setDistanceKm(request.distanceKm());
    travel.setOneWayTimeMin(request.oneWayTimeMin());
    travel.setUpdatedAt(OffsetDateTime.now());
    travel = travelRepository.save(travel);
    // PoC (S-02): synchronous recalculation after travel change
    calculationService.recalculate(objectId);
    return equipmentMapper.toTravelDto(travel);
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
