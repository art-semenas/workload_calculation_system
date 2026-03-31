package com.workload.service;

import com.workload.dto.ObjectCreateRequest;
import com.workload.dto.ObjectDto;
import com.workload.dto.ObjectUpdateRequest;
import com.workload.dto.SummaryDto;
import com.workload.entity.Branch;
import com.workload.entity.ObjectEntity;
import com.workload.exception.BranchNotFoundException;
import com.workload.exception.ObjectNotFoundException;
import com.workload.exception.SummaryNotFoundException;
import com.workload.mapper.ObjectMapper;
import com.workload.mapper.SummaryMapper;
import com.workload.repository.BranchRepository;
import com.workload.repository.ObjectRepository;
import com.workload.repository.SummaryRepository;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Service;

@Service
public class ObjectService {

    private final ObjectRepository objectRepository;
    private final BranchRepository branchRepository;
    private final ObjectMapper objectMapper;
    private final SummaryRepository summaryRepository;
    private final SummaryMapper summaryMapper;

    public ObjectService(
            ObjectRepository objectRepository,
            BranchRepository branchRepository,
            ObjectMapper objectMapper,
            SummaryRepository summaryRepository,
            SummaryMapper summaryMapper) {
        this.objectRepository = objectRepository;
        this.branchRepository = branchRepository;
        this.objectMapper = objectMapper;
        this.summaryRepository = summaryRepository;
        this.summaryMapper = summaryMapper;
    }

    public List<ObjectDto> findAll(Optional<UUID> divisionId) {
        List<ObjectEntity> entities =
                divisionId
                        .map(objectRepository::findAllByBranchDivisionId)
                        .orElseGet(objectRepository::findAll);
        return entities.stream().map(objectMapper::toDto).toList();
    }

    public ObjectDto findById(UUID id) {
        ObjectEntity entity =
                objectRepository
                        .findById(id)
                        .orElseThrow(() -> new ObjectNotFoundException(id.toString()));
        return objectMapper.toDto(entity);
    }

    public ObjectDto create(ObjectCreateRequest request) {
        Branch branch =
                branchRepository
                        .findById(request.branchId())
                        .orElseThrow(
                                () -> new BranchNotFoundException(request.branchId().toString()));
        OffsetDateTime now = OffsetDateTime.now();
        ObjectEntity entity =
                ObjectEntity.builder()
                        .id(UUID.randomUUID())
                        .branch(branch)
                        .name(request.name())
                        .importSeqNo(request.importSeqNo())
                        .createdAt(now)
                        .updatedAt(now)
                        .build();
        entity = objectRepository.save(entity);
        return objectMapper.toDto(entity);
    }

    public ObjectDto update(UUID id, ObjectUpdateRequest request) {
        ObjectEntity entity =
                objectRepository
                        .findById(id)
                        .orElseThrow(() -> new ObjectNotFoundException(id.toString()));
        entity.setName(request.name());
        entity.setImportSeqNo(request.importSeqNo());
        entity.setUpdatedAt(OffsetDateTime.now());
        entity = objectRepository.save(entity);
        return objectMapper.toDto(entity);
    }

    public void delete(UUID id) {
        if (!objectRepository.existsById(id)) {
            throw new ObjectNotFoundException(id.toString());
        }
        objectRepository.deleteById(id);
    }

    public SummaryDto getSummary(UUID objectId) {
        if (!objectRepository.existsById(objectId)) {
            throw new ObjectNotFoundException(objectId.toString());
        }
        return summaryRepository
                .findByObjectId(objectId)
                .map(summaryMapper::toDto)
                .orElseThrow(() -> new SummaryNotFoundException(objectId.toString()));
    }
}
