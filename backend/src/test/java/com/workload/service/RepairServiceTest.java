package com.workload.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

import com.workload.dto.RepairDto;
import com.workload.dto.RepairUpdateRequest;
import com.workload.entity.ObjectEntity;
import com.workload.entity.ObjectRepair;
import com.workload.entity.RepairType;
import com.workload.mapper.EquipmentMapper;
import com.workload.repository.ObjectRepairRepository;
import com.workload.repository.ObjectRepository;
import com.workload.repository.RepairTypeRepository;
import com.workload.service.calculation.CalculationService;
import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class RepairServiceTest {

  @Mock private ObjectRepairRepository repairRepository;
  @Mock private ObjectRepository objectRepository;
  @Mock private RepairTypeRepository repairTypeRepository;
  @Mock private EquipmentMapper equipmentMapper;
  @Mock private CalculationService calculationService;

  @InjectMocks private RepairService repairService;

  private final UUID objectId = UUID.randomUUID();
  private final UUID repairTypeId = UUID.randomUUID();

  @Test
  void getAllReturnsRepairsForObject() {
    ObjectRepair repair = ObjectRepair.builder().id(UUID.randomUUID()).count(3).build();
    when(objectRepository.existsById(objectId)).thenReturn(true);
    when(repairRepository.findAllByObjectId(objectId)).thenReturn(List.of(repair));
    RepairDto dto = new RepairDto(repair.getId(), objectId, repairTypeId, "RT1", 3);
    when(equipmentMapper.toRepairDto(repair)).thenReturn(dto);

    List<RepairDto> result = repairService.getAll(objectId);

    assertThat(result).hasSize(1);
    assertThat(result.get(0).count()).isEqualTo(3);
  }

  @Test
  void updatePerformsUpsert() {
    ObjectEntity object = ObjectEntity.builder().id(objectId).build();
    RepairType rt =
        RepairType.builder().id(repairTypeId).name("RT1").timeMinutes(BigDecimal.TEN).build();
    when(objectRepository.findById(objectId)).thenReturn(Optional.of(object));
    when(repairTypeRepository.findById(repairTypeId)).thenReturn(Optional.of(rt));
    when(repairRepository.findByObjectIdAndRepairTypeId(objectId, repairTypeId))
        .thenReturn(Optional.empty());
    when(repairRepository.save(any(ObjectRepair.class))).thenAnswer(inv -> inv.getArgument(0));
    when(equipmentMapper.toRepairDto(any(ObjectRepair.class)))
        .thenAnswer(
            inv -> {
              ObjectRepair r = inv.getArgument(0);
              return new RepairDto(r.getId(), objectId, repairTypeId, "RT1", r.getCount());
            });

    RepairDto result = repairService.update(objectId, repairTypeId, new RepairUpdateRequest(5));

    assertThat(result.count()).isEqualTo(5);
  }
}
