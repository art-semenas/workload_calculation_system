package com.workload.controller;

import com.workload.dto.ApiResponse;
import com.workload.dto.CoverageGapDto;
import com.workload.service.AggregationService;
import java.util.List;
import java.util.UUID;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Coverage gaps are a management view over every object in a division. TOR §12 grants an engineer
 * their own workload dashboard only, so the engineer tier is refused here rather than filtered — a
 * per-engineer "gap" report would be meaningless.
 */
@RestController
@RequestMapping("/api/v1/coverage")
@PreAuthorize("!hasRole('ENGINEER')")
public class CoverageController {

  private final AggregationService aggregationService;

  public CoverageController(AggregationService aggregationService) {
    this.aggregationService = aggregationService;
  }

  @GetMapping("/gaps")
  public ResponseEntity<ApiResponse<List<CoverageGapDto>>> getCoverageGaps(
      @RequestParam(name = "division_id", required = false) UUID divisionId) {
    return ResponseEntity.ok(ApiResponse.success(aggregationService.getCoverageGaps(divisionId)));
  }
}
