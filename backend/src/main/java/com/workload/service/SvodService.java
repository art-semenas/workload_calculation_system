package com.workload.service;

import com.workload.dto.SvodRowDto;
import com.workload.entity.Branch;
import com.workload.entity.Division;
import com.workload.entity.ObjectEntity;
import com.workload.entity.Summary;
import com.workload.repository.ObjectEngineerRepository;
import com.workload.repository.SummaryRepository;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class SvodService {

  private final SummaryRepository summaryRepository;
  private final ObjectEngineerRepository objectEngineerRepository;

  public SvodService(
      SummaryRepository summaryRepository, ObjectEngineerRepository objectEngineerRepository) {
    this.summaryRepository = summaryRepository;
    this.objectEngineerRepository = objectEngineerRepository;
  }

  /**
   * @param engineerScopeId when non-null, restricts the СВОД to that engineer's assigned objects
   *     (TOR §12). Applied in the query so the page and total describe the scoped set.
   */
  @Transactional(readOnly = true)
  public Page<SvodRowDto> getSvod(Pageable pageable, UUID divisionId, UUID engineerScopeId) {
    // PoC: loads all summaries in memory for in-process pagination.
    // Replace with JPQL Page<Summary> query in MVP for DB-level pagination.
    List<Summary> all = summaryRepository.findAllScoped(divisionId, engineerScopeId);
    List<SvodRowDto> rows =
        all.stream()
            .map(this::toSvodRowDto)
            .sorted(
                Comparator.comparing(
                    SvodRowDto::itogoChisloWithTravel,
                    Comparator.nullsLast(Comparator.reverseOrder())))
            .toList();
    int start = (int) pageable.getOffset();
    int end = Math.min(start + pageable.getPageSize(), rows.size());
    List<SvodRowDto> page = start >= rows.size() ? List.of() : rows.subList(start, end);
    return new PageImpl<>(page, pageable, rows.size());
  }

  /** Same scoping as {@link #getSvod} — otherwise the export reads around the filter. */
  @Transactional(readOnly = true)
  public List<SvodRowDto> getAllForExport(UUID divisionId, UUID engineerScopeId) {
    return summaryRepository.findAllScoped(divisionId, engineerScopeId).stream()
        .map(this::toSvodRowDto)
        .toList();
  }

  private SvodRowDto toSvodRowDto(Summary s) {
    ObjectEntity o = s.getObject();
    Branch b = o.getBranch();
    Division d = b.getDivision();
    List<String> engineerNames =
        objectEngineerRepository.findAllByObjectId(o.getId()).stream()
            .map(oe -> oe.getEngineer().getName())
            .toList();
    return new SvodRowDto(
        o.getId(),
        o.getName(),
        o.getAddress(),
        d.getName(),
        b.getName(),
        engineerNames,
        s.getOsMonthlyAvg(),
        s.getPsMonthlyAvg(),
        s.getVideoMonthlyAvg(),
        s.getRecordsMonthly(),
        s.getRepairNoTravelMonthly(),
        s.getRepairWithTravelMonthly(),
        s.getRoundTripMin(),
        s.getPzvMinutes(),
        s.getTotalNoTravelMin(),
        s.getItogoChisloNoTravel(),
        s.getTotalWithTravelMin(),
        s.getItogoChisloWithTravel(),
        s.getR1PerVisitTotal(),
        s.getR2PerVisitTotal(),
        s.getComputedAt());
  }
}
