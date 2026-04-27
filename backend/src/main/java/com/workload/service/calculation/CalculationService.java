package com.workload.service.calculation;

import com.workload.config.WorkloadConfig;
import com.workload.entity.ObjectEntity;
import com.workload.entity.ObjectRepair;
import com.workload.entity.ObjectSystemAssignment;
import com.workload.entity.RecordsTask;
import com.workload.entity.Summary;
import com.workload.entity.SystemType;
import com.workload.entity.Travel;
import com.workload.repository.ObjectRepairRepository;
import com.workload.repository.ObjectRepository;
import com.workload.repository.ObjectSystemAssignmentRepository;
import com.workload.repository.RecordsTaskRepository;
import com.workload.repository.SummaryRepository;
import com.workload.repository.TravelRepository;
import com.workload.service.EngineerSummaryService;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class CalculationService {

  private final ObjectSystemAssignmentRepository assignmentRepo;
  private final RecordsTaskRepository recordsRepo;
  private final ObjectRepairRepository repairRepo;
  private final TravelRepository travelRepo;
  private final SummaryRepository summaryRepo;
  private final WorkloadConfig config;
  private final RepairCalculationHelper repairHelper;
  private final RecordsCalculationHelper recordsHelper;
  private final EngineerSummaryService engineerSummaryService;
  private final ObjectRepository objectRepository;

  // PoC (S-02): recalculates synchronously. Replaced by background worker in MVP M-06.
  public Summary recalculate(UUID objectId) {
    log.debug("Recalculating workload for object {}", objectId);

    // Stage 1 — Fetch data
    List<ObjectSystemAssignment> assignments = assignmentRepo.findAllByObjectId(objectId);
    Optional<RecordsTask> recordsOpt = recordsRepo.findByObjectId(objectId);
    List<ObjectRepair> repairs = repairRepo.findAllByObjectId(objectId);
    Optional<Travel> travelOpt = travelRepo.findByObjectId(objectId);

    // Stage 2 & 3 — Per-assignment contributions, grouped by system type
    BigDecimal osR1PerVisit = BigDecimal.ZERO;
    BigDecimal osR2PerVisit = BigDecimal.ZERO;
    BigDecimal psR1PerVisit = BigDecimal.ZERO;
    BigDecimal psR2PerVisit = BigDecimal.ZERO;
    BigDecimal videoR1PerVisit = BigDecimal.ZERO;
    BigDecimal videoR2PerVisit = BigDecimal.ZERO;

    for (ObjectSystemAssignment osa : assignments) {
      BigDecimal r1Contrib = osa.getQuantityMaintained().multiply(osa.getContext().getR1Minutes());
      BigDecimal r2Contrib = osa.getQuantityMaintained().multiply(osa.getContext().getR2Minutes());

      SystemType systemType = osa.getSystemType();
      if (systemType == SystemType.OS) {
        osR1PerVisit = osR1PerVisit.add(r1Contrib);
        osR2PerVisit = osR2PerVisit.add(r2Contrib);
      } else if (systemType == SystemType.PS) {
        psR1PerVisit = psR1PerVisit.add(r1Contrib);
        psR2PerVisit = psR2PerVisit.add(r2Contrib);
      } else if (systemType == SystemType.VIDEO) {
        videoR1PerVisit = videoR1PerVisit.add(r1Contrib);
        videoR2PerVisit = videoR2PerVisit.add(r2Contrib);
      }
    }

    // Stage 4 — Monthly averages per system
    BigDecimal twelve = BigDecimal.valueOf(12);

    BigDecimal osR1Annual =
        osR1PerVisit.multiply(BigDecimal.valueOf(config.getOsR1VisitsPerYear()));
    BigDecimal osR2Annual =
        osR2PerVisit.multiply(BigDecimal.valueOf(config.getOsR2VisitsPerYear()));
    BigDecimal osMonthlyAvg = osR1Annual.add(osR2Annual).divide(twelve, 10, RoundingMode.HALF_UP);

    BigDecimal psR1Annual =
        psR1PerVisit.multiply(BigDecimal.valueOf(config.getPsR1VisitsPerYear()));
    BigDecimal psR2Annual =
        psR2PerVisit.multiply(BigDecimal.valueOf(config.getPsR2VisitsPerYear()));
    BigDecimal psMonthlyAvg = psR1Annual.add(psR2Annual).divide(twelve, 10, RoundingMode.HALF_UP);

    BigDecimal videoR1Annual =
        videoR1PerVisit.multiply(BigDecimal.valueOf(config.getVideoR1VisitsPerYear()));
    BigDecimal videoR2Annual =
        videoR2PerVisit.multiply(BigDecimal.valueOf(config.getVideoR2VisitsPerYear()));
    BigDecimal videoMonthlyAvg =
        videoR1Annual.add(videoR2Annual).divide(twelve, 10, RoundingMode.HALF_UP);

    // Stage 5 — Records and repairs
    BigDecimal recordsMonthly = recordsHelper.calculateMonthly(recordsOpt.orElse(null), config);

    BigDecimal roundTripMin =
        travelOpt
            .map(t -> t.getOneWayTimeMin().multiply(BigDecimal.valueOf(2)))
            .orElse(BigDecimal.ZERO);

    RepairCalculationHelper.RepairResult repairResult =
        repairHelper.calculate(repairs, roundTripMin, config);

    // Stage 6 — Summary aggregation and totals
    BigDecimal pzv = BigDecimal.valueOf(config.getPzvMinutes());

    BigDecimal workComponents =
        osMonthlyAvg
            .add(psMonthlyAvg)
            .add(videoMonthlyAvg)
            .add(recordsMonthly)
            .add(repairResult.repairNoTravelMonthly());

    BigDecimal totalNoTravelMin =
        pzv.add(roundTripMin)
            .add(osMonthlyAvg)
            .add(psMonthlyAvg)
            .add(videoMonthlyAvg)
            .add(recordsMonthly)
            .add(repairResult.repairNoTravelMonthly());

    BigDecimal totalWithTravelMin =
        pzv.add(roundTripMin)
            .add(osMonthlyAvg)
            .add(psMonthlyAvg)
            .add(videoMonthlyAvg)
            .add(recordsMonthly)
            .add(repairResult.repairWithTravelMonthly());

    // DIVISOR = 60 × monthlyHoursFund / absenceCoefficient
    BigDecimal divisor =
        BigDecimal.valueOf(60)
            .multiply(config.getMonthlyHoursFund())
            .divide(config.getAbsenceCoefficient(), 10, RoundingMode.HALF_UP);

    BigDecimal itogoNoTravel;
    BigDecimal itogoWithTravel;

    // Zero guard (C-39): if all work components are zero, set itogo = 0
    if (workComponents.compareTo(BigDecimal.ZERO) == 0) {
      itogoNoTravel = BigDecimal.ZERO;
      itogoWithTravel = BigDecimal.ZERO;
    } else {
      itogoNoTravel = totalNoTravelMin.divide(divisor, 6, RoundingMode.HALF_UP);
      itogoWithTravel = totalWithTravelMin.divide(divisor, 6, RoundingMode.HALF_UP);
    }

    // r1/r2 per-visit totals across all systems
    BigDecimal r1PerVisitTotal = osR1PerVisit.add(psR1PerVisit).add(videoR1PerVisit);
    BigDecimal r2PerVisitTotal = osR2PerVisit.add(psR2PerVisit).add(videoR2PerVisit);

    // Stage 7 — Persist summary (upsert)
    Summary summary = summaryRepo.findByObjectId(objectId).orElse(new Summary());
    if (summary.getId() == null) {
      summary.setId(UUID.randomUUID());
    }

    // Resolve object reference from available data
    ObjectEntity objectRef =
        resolveObjectRef(objectId, assignments, repairs, recordsOpt, travelOpt);
    summary.setObject(objectRef);

    summary.setOsR1PerVisit(osR1PerVisit);
    summary.setOsR2PerVisit(osR2PerVisit);
    summary.setPsR1PerVisit(psR1PerVisit);
    summary.setPsR2PerVisit(psR2PerVisit);
    summary.setVideoR1PerVisit(videoR1PerVisit);
    summary.setVideoR2PerVisit(videoR2PerVisit);
    summary.setR1PerVisitTotal(r1PerVisitTotal);
    summary.setR2PerVisitTotal(r2PerVisitTotal);
    summary.setOsMonthlyAvg(osMonthlyAvg);
    summary.setPsMonthlyAvg(psMonthlyAvg);
    summary.setVideoMonthlyAvg(videoMonthlyAvg);
    summary.setRecordsMonthly(recordsMonthly);
    summary.setRepairNoTravelMonthly(repairResult.repairNoTravelMonthly());
    summary.setRepairWithTravelMonthly(repairResult.repairWithTravelMonthly());
    summary.setRoundTripMin(roundTripMin);
    summary.setPzvMinutes(pzv);
    summary.setTotalNoTravelMin(totalNoTravelMin);
    summary.setItogoChisloNoTravel(itogoNoTravel);
    summary.setTotalWithTravelMin(totalWithTravelMin);
    summary.setItogoChisloWithTravel(itogoWithTravel);
    summary.setComputedAt(OffsetDateTime.now());

    log.info("Workload recalculated for object {}: itogoWithTravel={}", objectId, itogoWithTravel);

    Summary saved = summaryRepo.save(summary);
    // PoC (S-02): calls engineer summary recalculation synchronously after object summary update.
    engineerSummaryService.recalculateAllForObject(objectId);
    return saved;
  }

  private ObjectEntity resolveObjectRef(
      UUID objectId,
      List<ObjectSystemAssignment> assignments,
      List<ObjectRepair> repairs,
      Optional<RecordsTask> recordsOpt,
      Optional<Travel> travelOpt) {

    if (!assignments.isEmpty() && assignments.get(0).getObject() != null) {
      return assignments.get(0).getObject();
    }
    if (!repairs.isEmpty() && repairs.get(0).getObject() != null) {
      return repairs.get(0).getObject();
    }
    if (recordsOpt.isPresent() && recordsOpt.get().getObject() != null) {
      return recordsOpt.get().getObject();
    }
    if (travelOpt.isPresent() && travelOpt.get().getObject() != null) {
      return travelOpt.get().getObject();
    }

    // Fallback: load a managed proxy so the reference stays in the Hibernate session
    return objectRepository.getReferenceById(objectId);
  }
}
