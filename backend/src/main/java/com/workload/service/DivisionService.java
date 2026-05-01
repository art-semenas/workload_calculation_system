package com.workload.service;

import com.workload.dto.DivisionCreateRequest;
import com.workload.dto.DivisionDto;
import com.workload.dto.DivisionUpdateRequest;
import com.workload.entity.Division;
import com.workload.exception.DivisionNotFoundException;
import com.workload.mapper.DivisionMapper;
import com.workload.repository.BranchRepository;
import com.workload.repository.DivisionRepository;
import com.workload.repository.ObjectEngineerRepository;
import com.workload.repository.ObjectRepository;
import com.workload.repository.SummaryRepository;
import com.workload.repository.UserRepository;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import org.springframework.stereotype.Service;

@Service
public class DivisionService {

  private final DivisionRepository divisionRepository;
  private final BranchRepository branchRepository;
  private final ObjectRepository objectRepository;
  private final DivisionMapper divisionMapper;
  private final SummaryRepository summaryRepository;
  private final UserRepository userRepository;
  private final ObjectEngineerRepository objectEngineerRepository;

  public DivisionService(
      DivisionRepository divisionRepository,
      BranchRepository branchRepository,
      ObjectRepository objectRepository,
      DivisionMapper divisionMapper,
      SummaryRepository summaryRepository,
      UserRepository userRepository,
      ObjectEngineerRepository objectEngineerRepository) {
    this.divisionRepository = divisionRepository;
    this.branchRepository = branchRepository;
    this.objectRepository = objectRepository;
    this.divisionMapper = divisionMapper;
    this.summaryRepository = summaryRepository;
    this.userRepository = userRepository;
    this.objectEngineerRepository = objectEngineerRepository;
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
    UUID divisionId = division.getId();
    long branchCount = branchRepository.countByDivisionId(divisionId);
    long objectCount = objectRepository.countByBranchDivisionId(divisionId);

    // Compute metrics
    long engineerCount = userRepository.countByHomeDivisionIdAndActiveTrue(divisionId);

    List<com.workload.entity.Summary> summaries =
        summaryRepository.findAllByDivisionIdWithOrgHierarchy(divisionId);
    BigDecimal requiredFte =
        summaries.stream()
            .map(
                s ->
                    s.getItogoChisloWithTravel() != null
                        ? s.getItogoChisloWithTravel()
                        : BigDecimal.ZERO)
            .reduce(BigDecimal.ZERO, BigDecimal::add);

    Set<UUID> assignedObjectIds =
        new HashSet<>(objectEngineerRepository.findAllAssignedObjectIdsByDivision(divisionId));
    long coverageGap =
        summaries.stream().filter(s -> !assignedObjectIds.contains(s.getObject().getId())).count();

    // Utilisation is computed as SUM(total_load) / SUM(capacity_fte) for division engineers
    // Nullable — return null if no engineers or data unavailable
    BigDecimal utilisation = null;

    return divisionMapper.toDto(
        division, branchCount, objectCount, engineerCount, requiredFte, coverageGap, utilisation);
  }
}
