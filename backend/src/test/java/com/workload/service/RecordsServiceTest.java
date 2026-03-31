package com.workload.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

import com.workload.dto.RecordsDto;
import com.workload.dto.RecordsUpdateRequest;
import com.workload.entity.ObjectEntity;
import com.workload.entity.RecordsTask;
import com.workload.mapper.EquipmentMapper;
import com.workload.repository.ObjectRepository;
import com.workload.repository.RecordsTaskRepository;
import java.time.OffsetDateTime;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class RecordsServiceTest {

    @Mock private RecordsTaskRepository recordsTaskRepository;
    @Mock private ObjectRepository objectRepository;
    @Mock private EquipmentMapper equipmentMapper;

    @InjectMocks private RecordsService recordsService;

    private final UUID objectId = UUID.randomUUID();

    @Test
    void getReturnsDefaultWhenNoRowExists() {
        when(objectRepository.existsById(objectId)).thenReturn(true);
        when(recordsTaskRepository.findByObjectId(objectId)).thenReturn(Optional.empty());

        RecordsDto result = recordsService.get(objectId);

        assertThat(result.objectId()).isEqualTo(objectId);
        assertThat(result.accessRequests()).isZero();
    }

    @Test
    void updatePerformsUpsert() {
        ObjectEntity object = ObjectEntity.builder().id(objectId).build();
        when(objectRepository.findById(objectId)).thenReturn(Optional.of(object));
        when(recordsTaskRepository.findByObjectId(objectId)).thenReturn(Optional.empty());
        when(recordsTaskRepository.save(any(RecordsTask.class))).thenAnswer(inv -> inv.getArgument(0));
        when(equipmentMapper.toRecordsDto(any(RecordsTask.class)))
                .thenAnswer(inv -> {
                    RecordsTask t = inv.getArgument(0);
                    return new RecordsDto(t.getId(), objectId, t.getAccessRequests(), t.getMonitoringRequests(),
                            t.getFootageRequests(), t.getBackupControl(), t.getSecurityAdmin());
                });

        RecordsDto result = recordsService.update(objectId, new RecordsUpdateRequest(5, 3, 2, 1, 0));

        assertThat(result.accessRequests()).isEqualTo(5);
        assertThat(result.monitoringRequests()).isEqualTo(3);
    }
}
