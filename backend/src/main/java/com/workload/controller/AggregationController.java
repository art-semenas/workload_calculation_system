package com.workload.controller;

import com.workload.dto.AggregationBranchDto;
import com.workload.dto.AggregationCompanyDto;
import com.workload.dto.AggregationDivisionDto;
import com.workload.dto.ApiResponse;
import com.workload.service.AggregationService;
import java.util.List;
import java.util.UUID;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/aggregations")
public class AggregationController {

  private final AggregationService aggregationService;

  public AggregationController(AggregationService aggregationService) {
    this.aggregationService = aggregationService;
  }

  @GetMapping("/company")
  public ResponseEntity<ApiResponse<AggregationCompanyDto>> getCompany() {
    return ResponseEntity.ok(ApiResponse.success(aggregationService.getCompany()));
  }

  @GetMapping("/divisions")
  public ResponseEntity<ApiResponse<List<AggregationDivisionDto>>> getDivisions() {
    return ResponseEntity.ok(ApiResponse.success(aggregationService.getDivisions()));
  }

  @GetMapping("/divisions/{id}")
  public ResponseEntity<ApiResponse<AggregationDivisionDto>> getDivision(@PathVariable UUID id) {
    return ResponseEntity.ok(ApiResponse.success(aggregationService.getDivision(id)));
  }

  @GetMapping("/branches")
  public ResponseEntity<ApiResponse<List<AggregationBranchDto>>> getBranches() {
    return ResponseEntity.ok(ApiResponse.success(aggregationService.getBranches()));
  }

  @GetMapping("/branches/{id}")
  public ResponseEntity<ApiResponse<AggregationBranchDto>> getBranch(@PathVariable UUID id) {
    return ResponseEntity.ok(ApiResponse.success(aggregationService.getBranch(id)));
  }
}
