package com.workload.service;

import com.workload.config.WorkloadConfig;
import com.workload.dto.EngineerSummaryDto;
import com.workload.entity.EngineerSummary;
import com.workload.entity.ObjectEngineer;
import com.workload.entity.Summary;
import com.workload.entity.User;
import com.workload.exception.SummaryNotFoundException;
import com.workload.mapper.EngineerSummaryMapper;
import com.workload.repository.EngineerSummaryRepository;
import com.workload.repository.ObjectEngineerRepository;
import com.workload.repository.SummaryRepository;
import com.workload.repository.UserRepository;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Slf4j
public class EngineerSummaryService {

  private static final int SHARE_SCALE = 10;
  private static final int RATIO_SCALE = 6;

  private final ObjectEngineerRepository objectEngineerRepository;
  private final SummaryRepository summaryRepository;
  private final EngineerSummaryRepository engineerSummaryRepository;
  private final UserRepository userRepository;
  private final WorkloadConfig config;
  private final EngineerSummaryMapper engineerSummaryMapper;

  /**
   * Recalculates the engineer summary for the given engineer.
   *
   * <p>Loads all object assignments, computes the share of workload per object (divided by
   * co-engineer count), aggregates totals, computes load ratio against capacity, and upserts the
   * engineer_summaries row.
   */
  @Transactional
  public void recalculate(UUID engineerId) {
    User engineer =
        userRepository
            .findById(engineerId)
            .orElseThrow(() -> new IllegalArgumentException("Engineer not found: " + engineerId));

    List<ObjectEngineer> assignments = objectEngineerRepository.findAllByEngineerId(engineerId);

    BigDecimal totalLoad = BigDecimal.ZERO;
    BigDecimal osLoad = BigDecimal.ZERO;
    BigDecimal psLoad = BigDecimal.ZERO;
    BigDecimal videoLoad = BigDecimal.ZERO;
    BigDecimal recordsLoad = BigDecimal.ZERO;
    BigDecimal repairLoad = BigDecimal.ZERO;
    int objectCount = assignments.size();

    for (ObjectEngineer assignment : assignments) {
      UUID objectId = assignment.getObject().getId();
      int engineerCount = objectEngineerRepository.countByObjectId(objectId);

      Optional<Summary> summaryOpt = summaryRepository.findByObjectId(objectId);
      if (summaryOpt.isEmpty()) {
        log.debug("No summary found for objectId={}, treating itogo as zero", objectId);
      }

      Summary summary = summaryOpt.orElseGet(Summary::new);
      BigDecimal itogo =
          summary.getItogoChisloWithTravel() != null
              ? summary.getItogoChisloWithTravel()
              : BigDecimal.ZERO;

      BigDecimal countBd = BigDecimal.valueOf(engineerCount);

      // §6.12.1 — object share
      BigDecimal objectShare = itogo.divide(countBd, SHARE_SCALE, RoundingMode.HALF_UP);
      totalLoad = totalLoad.add(objectShare);

      // §6.12.2 — per-component shares
      osLoad = osLoad.add(componentShare(summary.getOsMonthlyAvg(), countBd));
      psLoad = psLoad.add(componentShare(summary.getPsMonthlyAvg(), countBd));
      videoLoad = videoLoad.add(componentShare(summary.getVideoMonthlyAvg(), countBd));
      recordsLoad = recordsLoad.add(componentShare(summary.getRecordsMonthly(), countBd));
      repairLoad = repairLoad.add(componentShare(summary.getRepairWithTravelMonthly(), countBd));
    }

    // §6.13 — load ratio and status
    BigDecimal capacityFte =
        engineer.getCapacityFte() != null ? engineer.getCapacityFte() : BigDecimal.ONE;

    BigDecimal loadRatio;
    String status;
    if (totalLoad.compareTo(BigDecimal.ZERO) == 0) {
      loadRatio = BigDecimal.ZERO;
      status = "normal";
    } else {
      loadRatio = totalLoad.divide(capacityFte, RATIO_SCALE, RoundingMode.HALF_UP);
      status = resolveStatus(loadRatio);
    }

    // Upsert engineer_summaries
    EngineerSummary es =
        engineerSummaryRepository
            .findByEngineerId(engineerId)
            .orElseGet(
                () -> EngineerSummary.builder().id(UUID.randomUUID()).engineer(engineer).build());

    es.setTotalLoad(totalLoad);
    es.setObjectCount(objectCount);
    es.setOsLoad(osLoad);
    es.setPsLoad(psLoad);
    es.setVideoLoad(videoLoad);
    es.setRecordsLoad(recordsLoad);
    es.setRepairLoad(repairLoad);
    es.setCapacityFte(capacityFte);
    es.setLoadRatio(loadRatio);
    es.setStatus(status);
    es.setComputedAt(OffsetDateTime.now());

    engineerSummaryRepository.save(es);

    log.info(
        "Recalculated engineer summary: engineerId={}, totalLoad={}, loadRatio={}, status={}",
        engineerId,
        totalLoad,
        loadRatio,
        status);
  }

  /**
   * Recalculates engineer summaries for all engineers assigned to the given object.
   *
   * <p>PoC (S-02): recalculates all engineer summaries synchronously after object summary update.
   */
  @Transactional
  public void recalculateAllForObject(UUID objectId) {
    List<ObjectEngineer> assignments = objectEngineerRepository.findAllByObjectId(objectId);
    log.debug(
        "recalculateAllForObject: objectId={}, engineerCount={}", objectId, assignments.size());
    for (ObjectEngineer assignment : assignments) {
      recalculate(assignment.getEngineer().getId());
    }
  }

  /**
   * Removes the engineer summary row for the given engineer. Called when an engineer is deactivated
   * or all assignments are removed.
   */
  @Transactional
  public void deleteByEngineerId(UUID engineerId) {
    engineerSummaryRepository.deleteByEngineerId(engineerId);
    log.info("Deleted engineer summary for engineerId={}", engineerId);
  }

  @Transactional(readOnly = true)
  public EngineerSummaryDto getEngineerSummary(UUID engineerId) {
    EngineerSummary summary =
        engineerSummaryRepository
            .findByEngineerId(engineerId)
            .orElseThrow(
                () ->
                    new SummaryNotFoundException(
                        "Engineer summary not found for engineer: " + engineerId));
    return engineerSummaryMapper.toDto(summary);
  }

  // -------------------------------------------------------------------------
  // Private helpers
  // -------------------------------------------------------------------------

  /**
   * §6.12.2: component_coefficient = monthly_avg / 60 / monthlyHoursFund * absenceCoefficient
   * engineer_component_share = component_coefficient / engineerCount
   */
  private BigDecimal componentShare(BigDecimal monthlyAvg, BigDecimal engineerCount) {
    if (monthlyAvg == null || monthlyAvg.compareTo(BigDecimal.ZERO) == 0) {
      return BigDecimal.ZERO;
    }
    BigDecimal sixty = BigDecimal.valueOf(60);
    BigDecimal monthlyHoursFund = config.getMonthlyHoursFund();
    BigDecimal absenceCoefficient = config.getAbsenceCoefficient();

    // component_coefficient = monthly_avg / 60 / monthlyHoursFund * absenceCoefficient
    BigDecimal coefficient =
        monthlyAvg
            .divide(sixty, SHARE_SCALE, RoundingMode.HALF_UP)
            .divide(monthlyHoursFund, SHARE_SCALE, RoundingMode.HALF_UP)
            .multiply(absenceCoefficient);

    return coefficient.divide(engineerCount, SHARE_SCALE, RoundingMode.HALF_UP);
  }

  /** §6.13 — Determines engineer workload status from load ratio. */
  private String resolveStatus(BigDecimal loadRatio) {
    BigDecimal warningThreshold = config.getEngineerWarningThreshold();
    if (loadRatio.compareTo(BigDecimal.ONE) >= 0) {
      return "overloaded";
    } else if (loadRatio.compareTo(warningThreshold) >= 0) {
      return "warning";
    } else {
      return "normal";
    }
  }
}
