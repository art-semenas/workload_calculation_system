package com.workload.service;

import com.workload.dto.DivisionCreateRequest;
import com.workload.dto.DivisionDto;
import com.workload.dto.DivisionUpdateRequest;
import com.workload.entity.Division;
import com.workload.exception.DivisionNotFoundException;
import com.workload.mapper.DivisionMapper;
import com.workload.repository.BranchRepository;
import com.workload.repository.DivisionCount;
import com.workload.repository.DivisionFteSum;
import com.workload.repository.DivisionRepository;
import com.workload.repository.ObjectRepository;
import com.workload.repository.SummaryRepository;
import com.workload.repository.UserRepository;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class DivisionService {

  private final DivisionRepository divisionRepository;
  private final BranchRepository branchRepository;
  private final ObjectRepository objectRepository;
  private final DivisionMapper divisionMapper;
  private final SummaryRepository summaryRepository;
  private final UserRepository userRepository;

  public DivisionService(
      DivisionRepository divisionRepository,
      BranchRepository branchRepository,
      ObjectRepository objectRepository,
      DivisionMapper divisionMapper,
      SummaryRepository summaryRepository,
      UserRepository userRepository) {
    this.divisionRepository = divisionRepository;
    this.branchRepository = branchRepository;
    this.objectRepository = objectRepository;
    this.divisionMapper = divisionMapper;
    this.summaryRepository = summaryRepository;
    this.userRepository = userRepository;
  }

  @Transactional(readOnly = true)
  public List<DivisionDto> findAll() {
    List<Division> divisions = divisionRepository.findAll();
    if (divisions.isEmpty()) {
      return List.of();
    }

    Map<UUID, Long> branchCounts = toCountMap(branchRepository.findCountsGroupedByDivisionId());
    Map<UUID, Long> objectCounts = toCountMap(objectRepository.findCountsGroupedByDivisionId());
    Map<UUID, Long> engineerCounts =
        toCountMap(userRepository.findActiveCountsGroupedByDivisionId());

    Map<UUID, BigDecimal> requiredFteMap = new HashMap<>();
    for (DivisionFteSum r : summaryRepository.findRequiredFteGroupedByDivision()) {
      requiredFteMap.put(r.getDivisionId(), r.getRequiredFte());
    }
    Map<UUID, Long> unassignedCountMap =
        toCountMap(summaryRepository.findUnassignedCountGroupedByDivision());

    return divisions.stream()
        .map(
            d ->
                divisionMapper.toDto(
                    d,
                    branchCounts.getOrDefault(d.getId(), 0L),
                    objectCounts.getOrDefault(d.getId(), 0L),
                    engineerCounts.getOrDefault(d.getId(), 0L),
                    requiredFteMap.getOrDefault(d.getId(), BigDecimal.ZERO),
                    unassignedCountMap.getOrDefault(d.getId(), 0L),
                    null))
        .toList();
  }

  private static Map<UUID, Long> toCountMap(List<DivisionCount> rows) {
    Map<UUID, Long> map = new HashMap<>();
    for (DivisionCount row : rows) {
      map.put(row.getDivisionId(), row.getCount());
    }
    return map;
  }

  @Transactional(readOnly = true)
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

  // PoC (S-02): fires 5 point queries for a single division. Acceptable for create/update (called
  // once).
  // Replace with a batch equivalent in MVP when division management sees higher write volume.
  private DivisionDto toDto(Division division) {
    UUID divisionId = division.getId();
    long branchCount = branchRepository.countByDivisionId(divisionId);
    long objectCount = objectRepository.countByBranchDivisionId(divisionId);
    long engineerCount = userRepository.countByHomeDivisionIdAndActiveTrue(divisionId);
    BigDecimal requiredFte = summaryRepository.findRequiredFteByDivisionId(divisionId);
    Long unassignedObjectCount = summaryRepository.findUnassignedCountByDivisionId(divisionId);

    // PoC (S-02): utilisation = SUM(total_load) / SUM(capacity_fte) per division engineer.
    // Engineer load summaries are not yet aggregated in this phase. Always null until MVP M-06.
    BigDecimal utilisation = null;

    return divisionMapper.toDto(
        division,
        branchCount,
        objectCount,
        engineerCount,
        requiredFte,
        unassignedObjectCount != null ? unassignedObjectCount : 0L,
        utilisation);
  }
}
