package com.workload.service;

import com.workload.config.WorkloadConfig;
import com.workload.dto.AggregationBranchDto;
import com.workload.dto.AggregationCompanyDto;
import com.workload.dto.AggregationDivisionDto;
import com.workload.dto.ComponentBreakdownDto;
import com.workload.dto.CoverageGapDto;
import com.workload.entity.Branch;
import com.workload.entity.Division;
import com.workload.entity.Summary;
import com.workload.exception.BranchNotFoundException;
import com.workload.exception.DivisionNotFoundException;
import com.workload.repository.BranchRepository;
import com.workload.repository.DivisionRepository;
import com.workload.repository.EngineerSummaryRepository;
import com.workload.repository.SummaryRepository;
import com.workload.repository.UserRepository;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
@Slf4j
public class AggregationService {

  private final SummaryRepository summaryRepository;
  private final DivisionRepository divisionRepository;
  private final BranchRepository branchRepository;
  private final UserRepository userRepository;
  private final EngineerSummaryRepository engineerSummaryRepository;
  private final WorkloadConfig config;

  public AggregationCompanyDto getCompany() {
    List<Summary> summaries = summaryRepository.findAllWithOrgHierarchy();
    log.debug("Aggregating company-level data from {} summaries", summaries.size());

    BigDecimal requiredFte = sumItogo(summaries);
    BigDecimal staffingNeed = computeStaffingNeed(requiredFte);
    int objectCount = summaries.size();
    long divisionCount =
        summaries.stream()
            .map(s -> s.getObject().getBranch().getDivision().getId())
            .distinct()
            .count();
    ComponentBreakdownDto breakdown = buildBreakdown(summaries);

    return new AggregationCompanyDto(
        requiredFte, staffingNeed, objectCount, (int) divisionCount, breakdown);
  }

  public List<AggregationDivisionDto> getDivisions() {
    List<Summary> summaries = summaryRepository.findAllWithOrgHierarchy();

    Map<UUID, List<Summary>> byDivision =
        summaries.stream()
            .collect(Collectors.groupingBy(s -> s.getObject().getBranch().getDivision().getId()));

    return byDivision.entrySet().stream()
        .map(
            entry -> {
              UUID divId = entry.getKey();
              List<Summary> divSummaries = entry.getValue();
              Division division = divSummaries.get(0).getObject().getBranch().getDivision();
              return buildDivisionDto(division, divSummaries);
            })
        .toList();
  }

  public AggregationDivisionDto getDivision(UUID divisionId) {
    Division division =
        divisionRepository
            .findById(divisionId)
            .orElseThrow(() -> new DivisionNotFoundException(divisionId.toString()));

    List<Summary> summaries = summaryRepository.findAllByDivisionIdWithOrgHierarchy(divisionId);

    return buildDivisionDto(division, summaries);
  }

  public List<AggregationBranchDto> getBranches() {
    List<Summary> summaries = summaryRepository.findAllWithOrgHierarchy();

    Map<UUID, List<Summary>> byBranch =
        summaries.stream().collect(Collectors.groupingBy(s -> s.getObject().getBranch().getId()));

    return byBranch.entrySet().stream()
        .map(
            entry -> {
              UUID branchId = entry.getKey();
              List<Summary> branchSummaries = entry.getValue();
              Branch branch = branchSummaries.get(0).getObject().getBranch();
              return buildBranchDto(branch, branchSummaries);
            })
        .toList();
  }

  public AggregationBranchDto getBranch(UUID branchId) {
    Branch branch =
        branchRepository
            .findById(branchId)
            .orElseThrow(() -> new BranchNotFoundException(branchId.toString()));

    List<Summary> summaries = summaryRepository.findAllByBranchIdWithOrgHierarchy(branchId);

    return buildBranchDto(branch, summaries);
  }

  // PoC (S-02): all objects are coverage gaps — no object_engineers table yet.
  public List<CoverageGapDto> getCoverageGaps(UUID divisionId) {
    List<Summary> summaries =
        divisionId != null
            ? summaryRepository.findAllByDivisionIdWithOrgHierarchy(divisionId)
            : summaryRepository.findAllWithOrgHierarchy();

    return summaries.stream()
        .map(
            s ->
                new CoverageGapDto(
                    s.getObject().getId(),
                    s.getObject().getName(),
                    s.getObject().getAddress(),
                    s.getObject().getBranch().getDivision().getName(),
                    s.getObject().getBranch().getName(),
                    s.getItogoChisloWithTravel()))
        .toList();
  }

  // -------------------------------------------------------------------------
  // Private helpers
  // -------------------------------------------------------------------------

  private AggregationDivisionDto buildDivisionDto(Division division, List<Summary> summaries) {
    BigDecimal requiredFte = sumItogo(summaries);
    BigDecimal staffingNeed = computeStaffingNeed(requiredFte);
    int objectCount = summaries.size();
    ComponentBreakdownDto breakdown = buildBreakdown(summaries);
    int[] engineerCounts = engineerCountsForDivision(division.getId());

    return new AggregationDivisionDto(
        division.getId(),
        division.getName(),
        objectCount,
        requiredFte,
        staffingNeed,
        requiredFte,
        objectCount,
        engineerCounts[0],
        engineerCounts[1],
        engineerCounts[2],
        breakdown);
  }

  private AggregationBranchDto buildBranchDto(Branch branch, List<Summary> summaries) {
    BigDecimal requiredFte = sumItogo(summaries);
    BigDecimal staffingNeed = computeStaffingNeed(requiredFte);
    int objectCount = summaries.size();
    ComponentBreakdownDto breakdown = buildBreakdown(summaries);
    Division division = branch.getDivision();
    int[] engineerCounts = engineerCountsForDivision(division.getId());

    return new AggregationBranchDto(
        branch.getId(),
        branch.getName(),
        division.getId(),
        division.getName(),
        objectCount,
        requiredFte,
        staffingNeed,
        engineerCounts[0],
        engineerCounts[1],
        engineerCounts[2],
        breakdown);
  }

  private BigDecimal sumItogo(List<Summary> summaries) {
    return summaries.stream()
        .map(
            s ->
                s.getItogoChisloWithTravel() != null
                    ? s.getItogoChisloWithTravel()
                    : BigDecimal.ZERO)
        .reduce(BigDecimal.ZERO, BigDecimal::add);
  }

  private BigDecimal computeStaffingNeed(BigDecimal requiredFte) {
    return requiredFte
        .multiply(BigDecimal.TEN)
        .setScale(0, RoundingMode.CEILING)
        .divide(BigDecimal.TEN);
  }

  private ComponentBreakdownDto buildBreakdown(List<Summary> summaries) {
    BigDecimal os =
        summaries.stream()
            .map(s -> toFte(s.getOsMonthlyAvg()))
            .reduce(BigDecimal.ZERO, BigDecimal::add);
    BigDecimal ps =
        summaries.stream()
            .map(s -> toFte(s.getPsMonthlyAvg()))
            .reduce(BigDecimal.ZERO, BigDecimal::add);
    BigDecimal video =
        summaries.stream()
            .map(s -> toFte(s.getVideoMonthlyAvg()))
            .reduce(BigDecimal.ZERO, BigDecimal::add);
    BigDecimal records =
        summaries.stream()
            .map(s -> toFte(s.getRecordsMonthly()))
            .reduce(BigDecimal.ZERO, BigDecimal::add);
    BigDecimal repair =
        summaries.stream()
            .map(s -> toFte(s.getRepairWithTravelMonthly()))
            .reduce(BigDecimal.ZERO, BigDecimal::add);
    return new ComponentBreakdownDto(os, ps, video, records, repair);
  }

  private BigDecimal toFte(BigDecimal monthlyAvgMin) {
    if (monthlyAvgMin == null || monthlyAvgMin.compareTo(BigDecimal.ZERO) == 0) {
      return BigDecimal.ZERO;
    }
    // monthlyAvgMin × absenceCoefficient / 60 / monthlyHoursFund
    return monthlyAvgMin
        .multiply(config.getAbsenceCoefficient())
        .divide(
            BigDecimal.valueOf(60).multiply(config.getMonthlyHoursFund()), 6, RoundingMode.HALF_UP);
  }

  private int[] engineerCountsForDivision(UUID divisionId) {
    int total = (int) userRepository.countByHomeDivisionIdAndActiveTrue(divisionId);
    int overloaded =
        (int)
            engineerSummaryRepository.countByEngineerHomeDivisionIdAndStatus(
                divisionId, "overloaded");
    int warning =
        (int)
            engineerSummaryRepository.countByEngineerHomeDivisionIdAndStatus(divisionId, "warning");
    return new int[] {total, overloaded, warning};
  }
}
