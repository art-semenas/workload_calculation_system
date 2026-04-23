package com.workload.controller;

import com.workload.dto.ApiResponse;
import com.workload.dto.CoverageGapDto;
import com.workload.service.AggregationService;
import java.util.List;
import java.util.UUID;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/coverage")
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
