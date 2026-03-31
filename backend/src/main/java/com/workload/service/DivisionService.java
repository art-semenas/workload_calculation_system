package com.workload.service;

import com.workload.dto.DivisionCreateRequest;
import com.workload.dto.DivisionDto;
import com.workload.dto.DivisionUpdateRequest;
import com.workload.entity.Division;
import com.workload.exception.DivisionNotFoundException;
import com.workload.mapper.DivisionMapper;
import com.workload.repository.BranchRepository;
import com.workload.repository.DivisionRepository;
import com.workload.repository.ObjectRepository;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;

@Service
public class DivisionService {

    private final DivisionRepository divisionRepository;
    private final BranchRepository branchRepository;
    private final ObjectRepository objectRepository;
    private final DivisionMapper divisionMapper;

    public DivisionService(
            DivisionRepository divisionRepository,
            BranchRepository branchRepository,
            ObjectRepository objectRepository,
            DivisionMapper divisionMapper) {
        this.divisionRepository = divisionRepository;
        this.branchRepository = branchRepository;
        this.objectRepository = objectRepository;
        this.divisionMapper = divisionMapper;
    }

    public List<DivisionDto> findAll() {
        return divisionRepository.findAll().stream().map(this::toDto).toList();
    }

    public DivisionDto findById(UUID id) {
        Division division =
                divisionRepository
                        .findById(id)
                        .orElseThrow(() -> new DivisionNotFoundException(id.toString()));
        return toDto(division);
    }

    public DivisionDto create(DivisionCreateRequest request) {
        OffsetDateTime now = OffsetDateTime.now();
        Division division =
                Division.builder()
                        .id(UUID.randomUUID())
                        .name(request.name())
                        .createdAt(now)
                        .updatedAt(now)
                        .build();
        division = divisionRepository.save(division);
        return toDto(division);
    }

    public DivisionDto update(UUID id, DivisionUpdateRequest request) {
        Division division =
                divisionRepository
                        .findById(id)
                        .orElseThrow(() -> new DivisionNotFoundException(id.toString()));
        division.setName(request.name());
        division.setUpdatedAt(OffsetDateTime.now());
        division = divisionRepository.save(division);
        return toDto(division);
    }

    private DivisionDto toDto(Division division) {
        long branchCount = branchRepository.countByDivisionId(division.getId());
        long objectCount = objectRepository.countByBranchDivisionId(division.getId());
        return divisionMapper.toDto(division, branchCount, objectCount);
    }
}
