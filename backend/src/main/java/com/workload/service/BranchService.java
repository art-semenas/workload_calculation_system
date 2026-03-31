package com.workload.service;

import com.workload.dto.BranchCreateRequest;
import com.workload.dto.BranchDto;
import com.workload.dto.BranchUpdateRequest;
import com.workload.entity.Branch;
import com.workload.entity.Division;
import com.workload.exception.BranchNotFoundException;
import com.workload.exception.DivisionNotFoundException;
import com.workload.mapper.BranchMapper;
import com.workload.repository.BranchRepository;
import com.workload.repository.DivisionRepository;
import com.workload.repository.ObjectRepository;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;

@Service
public class BranchService {

    private final BranchRepository branchRepository;
    private final DivisionRepository divisionRepository;
    private final ObjectRepository objectRepository;
    private final BranchMapper branchMapper;

    public BranchService(
            BranchRepository branchRepository,
            DivisionRepository divisionRepository,
            ObjectRepository objectRepository,
            BranchMapper branchMapper) {
        this.branchRepository = branchRepository;
        this.divisionRepository = divisionRepository;
        this.objectRepository = objectRepository;
        this.branchMapper = branchMapper;
    }

    public List<BranchDto> findByDivision(UUID divisionId) {
        divisionRepository
                .findById(divisionId)
                .orElseThrow(() -> new DivisionNotFoundException(divisionId.toString()));
        return branchRepository.findAllByDivisionId(divisionId).stream()
                .map(this::toDto)
                .toList();
    }

    public BranchDto findById(UUID id) {
        Branch branch =
                branchRepository
                        .findById(id)
                        .orElseThrow(() -> new BranchNotFoundException(id.toString()));
        return toDto(branch);
    }

    public BranchDto create(UUID divisionId, BranchCreateRequest request) {
        Division division =
                divisionRepository
                        .findById(divisionId)
                        .orElseThrow(() -> new DivisionNotFoundException(divisionId.toString()));
        OffsetDateTime now = OffsetDateTime.now();
        Branch branch =
                Branch.builder()
                        .id(UUID.randomUUID())
                        .division(division)
                        .name(request.name())
                        .createdAt(now)
                        .updatedAt(now)
                        .build();
        branch = branchRepository.save(branch);
        return toDto(branch);
    }

    public BranchDto update(UUID id, BranchUpdateRequest request) {
        Branch branch =
                branchRepository
                        .findById(id)
                        .orElseThrow(() -> new BranchNotFoundException(id.toString()));
        branch.setName(request.name());
        branch.setUpdatedAt(OffsetDateTime.now());
        branch = branchRepository.save(branch);
        return toDto(branch);
    }

    private BranchDto toDto(Branch branch) {
        long objectCount = objectRepository.countByBranchId(branch.getId());
        return branchMapper.toDto(branch, objectCount);
    }
}
