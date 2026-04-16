package com.workload.service;

import com.workload.dto.SummaryDto;
import com.workload.dto.SvodRowDto;
import com.workload.entity.Branch;
import com.workload.entity.Division;
import com.workload.entity.ObjectEntity;
import com.workload.entity.Summary;
import com.workload.exception.ObjectNotFoundException;
import com.workload.mapper.SummaryMapper;
import com.workload.repository.SummaryRepository;
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
  private final SummaryMapper summaryMapper;

  public SvodService(SummaryRepository summaryRepository, SummaryMapper summaryMapper) {
    this.summaryRepository = summaryRepository;
    this.summaryMapper = summaryMapper;
  }

  @Transactional(readOnly = true)
  public Page<SvodRowDto> getSvod(Pageable pageable, UUID divisionId) {
    List<Summary> all =
        divisionId != null
            ? summaryRepository.findAllByDivisionIdWithOrgHierarchy(divisionId)
            : summaryRepository.findAllWithOrgHierarchy();
    List<SvodRowDto> rows = all.stream().map(this::toSvodRowDto).toList();
    int start = (int) pageable.getOffset();
    int end = Math.min(start + pageable.getPageSize(), rows.size());
    List<SvodRowDto> page = start >= rows.size() ? List.of() : rows.subList(start, end);
    return new PageImpl<>(page, pageable, rows.size());
  }

  @Transactional(readOnly = true)
  public SummaryDto getObjectSummary(UUID objectId) {
    Summary summary =
        summaryRepository
            .findByObjectId(objectId)
            .orElseThrow(() -> new ObjectNotFoundException(objectId.toString()));
    return summaryMapper.toDto(summary);
  }

  @Transactional(readOnly = true)
  public List<SvodRowDto> getAllForExport(UUID divisionId) {
    List<Summary> all =
        divisionId != null
            ? summaryRepository.findAllByDivisionIdWithOrgHierarchy(divisionId)
            : summaryRepository.findAllWithOrgHierarchy();
    return all.stream().map(this::toSvodRowDto).toList();
  }

  private SvodRowDto toSvodRowDto(Summary s) {
    ObjectEntity o = s.getObject();
    Branch b = o.getBranch();
    Division d = b.getDivision();
    return new SvodRowDto(
        o.getId(),
        o.getName(),
        d.getName(),
        b.getName(),
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
