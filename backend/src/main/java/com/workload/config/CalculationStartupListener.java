package com.workload.config;

import com.workload.repository.ObjectRepository;
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
  private final CalculationService calculationService;

  // PoC (S-02): synchronous recalculation for all objects on startup ensures the summaries table
  // is populated from data inserted outside the API (e.g. direct DB writes).
  // Replaced by background worker on data-change events in MVP M-06.
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
        calculationService.recalculate(id);
        success++;
      } catch (Exception e) {
        log.error("Startup recalculation: failed for object {}: {}", id, e.getMessage());
      }
    }
    log.info("Startup recalculation complete: {}/{} objects processed", success, objectIds.size());
  }
}
