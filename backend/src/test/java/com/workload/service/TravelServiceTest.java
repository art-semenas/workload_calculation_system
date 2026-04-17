package com.workload.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

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
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class TravelServiceTest {

  @Mock private TravelRepository travelRepository;
  @Mock private ObjectRepository objectRepository;
  @Mock private EquipmentMapper equipmentMapper;
  @Mock private CalculationService calculationService;

  @InjectMocks private TravelService travelService;

  private final UUID objectId = UUID.randomUUID();

  @Test
  void getReturnsDefaultWhenNoTravel() {
    when(objectRepository.existsById(objectId)).thenReturn(true);
    when(travelRepository.findByObjectId(objectId)).thenReturn(Optional.empty());

    TravelDto result = travelService.get(objectId);

    assertThat(result.objectId()).isEqualTo(objectId);
    assertThat(result.roundTripMin()).isEqualByComparingTo(BigDecimal.ZERO);
  }

  @Test
  void getThrowsWhenObjectMissing() {
    when(objectRepository.existsById(objectId)).thenReturn(false);

    assertThatThrownBy(() -> travelService.get(objectId))
        .isInstanceOf(ObjectNotFoundException.class);
  }

  @Test
  void updatePerformsUpsert() {
    ObjectEntity object = ObjectEntity.builder().id(objectId).build();
    when(objectRepository.findById(objectId)).thenReturn(Optional.of(object));
    when(travelRepository.findByObjectId(objectId)).thenReturn(Optional.empty());
    when(travelRepository.save(any(Travel.class))).thenAnswer(inv -> inv.getArgument(0));
    when(equipmentMapper.toTravelDto(any(Travel.class)))
        .thenAnswer(
            inv -> {
              Travel t = inv.getArgument(0);
              BigDecimal rt =
                  t.getOneWayTimeMin() != null
                      ? t.getOneWayTimeMin().multiply(BigDecimal.valueOf(2))
                      : BigDecimal.ZERO;
              return new TravelDto(
                  t.getId(),
                  objectId,
                  t.getTransportType(),
                  t.getDistanceKm(),
                  t.getOneWayTimeMin(),
                  rt);
            });

    TravelDto result =
        travelService.update(
            objectId,
            new TravelUpdateRequest("car", new BigDecimal("15.00"), new BigDecimal("30.00"), null));

    assertThat(result.oneWayTimeMin()).isEqualByComparingTo(new BigDecimal("30.00"));
    assertThat(result.roundTripMin()).isEqualByComparingTo(new BigDecimal("60.00"));
  }
}
