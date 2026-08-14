package com.workload.config;

import com.workload.repository.ObjectEngineerRepository;
import com.workload.repository.ObjectRepository;
import com.workload.service.EngineerSummaryService;
import com.workload.service.calculation.CalculationService;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class CalculationStartupListener {

  private final ObjectRepository objectRepository;
  private final ObjectEngineerRepository objectEngineerRepository;
  private final CalculationService calculationService;
  private final EngineerSummaryService engineerSummaryService;

  // PoC (S-02): synchronous recalculation for all objects on startup ensures the summaries table
  // is populated from data inserted outside the API (e.g. direct DB writes).
  // Replaced by background worker on data-change events in MVP M-06.
  //
  // Two phases on purpose. Recalculating an object cascades into a full re-aggregation of every
  // assigned engineer's portfolio, so cascading per object costs 2 × Σ(portfolio²) queries — for
  // 2934 objects across 123 engineers that is ~313k queries and over an hour. Doing every object
  // first and then each engineer exactly once makes it linear.
  @EventListener(ApplicationReadyEvent.class)
  public void recalculateAllOnStartup() {
    List<UUID> objectIds = objectRepository.findAllIds();

    if (objectIds.isEmpty()) {
      log.info("Startup recalculation: no objects found, skipping");
      return;
    }

    log.info("Startup recalculation: recalculating summaries for {} objects", objectIds.size());
    int success = 0;
    for (UUID id : objectIds) {
      try {
        calculationService.recalculate(id, false);
        success++;
      } catch (Exception e) {
        log.error("Startup recalculation: failed for object {}: {}", id, e.getMessage());
      }
    }

    List<UUID> engineerIds = objectEngineerRepository.findAllAssignedEngineerIds();
    int engineersDone = 0;
    for (UUID engineerId : engineerIds) {
      try {
        engineerSummaryService.recalculate(engineerId);
        engineersDone++;
      } catch (Exception e) {
        log.error("Startup recalculation: failed for engineer {}: {}", engineerId, e.getMessage());
      }
    }

    log.info(
        "Startup recalculation complete: {}/{} objects and {}/{} engineers processed",
        success,
        objectIds.size(),
        engineersDone,
        engineerIds.size());
  }
}
