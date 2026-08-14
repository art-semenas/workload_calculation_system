package com.workload.controller;

import com.workload.dto.ApiResponse;
import com.workload.dto.BranchCreateRequest;
import com.workload.dto.BranchDto;
import com.workload.dto.DivisionCreateRequest;
import com.workload.dto.DivisionDto;
import com.workload.dto.DivisionUpdateRequest;
import com.workload.service.BranchService;
import com.workload.service.DivisionService;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/divisions")
public class DivisionController {

  private final DivisionService divisionService;
  private final BranchService branchService;

  public DivisionController(DivisionService divisionService, BranchService branchService) {
    this.divisionService = divisionService;
    this.branchService = branchService;
  }

  @GetMapping
  public ResponseEntity<ApiResponse<List<DivisionDto>>> getAll() {
    return ResponseEntity.ok(ApiResponse.success(divisionService.findAll()));
  }

  @PreAuthorize("hasRole('ADMIN')")
  @PostMapping
  public ResponseEntity<ApiResponse<DivisionDto>> create(
      @Valid @RequestBody DivisionCreateRequest request) {
    DivisionDto dto = divisionService.create(request);
    return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(dto));
  }

  @GetMapping("/{id}")
  public ResponseEntity<ApiResponse<DivisionDto>> getById(@PathVariable UUID id) {
    return ResponseEntity.ok(ApiResponse.success(divisionService.findById(id)));
  }

  @PreAuthorize("hasRole('ADMIN')")
  @PutMapping("/{id}")
  public ResponseEntity<ApiResponse<DivisionDto>> update(
      @PathVariable UUID id, @Valid @RequestBody DivisionUpdateRequest request) {
    return ResponseEntity.ok(ApiResponse.success(divisionService.update(id, request)));
  }

  @GetMapping("/{id}/branches")
  public ResponseEntity<ApiResponse<List<BranchDto>>> getBranches(@PathVariable UUID id) {
    return ResponseEntity.ok(ApiResponse.success(branchService.findByDivision(id)));
  }

  @PreAuthorize("hasRole('ADMIN')")
  @PostMapping("/{id}/branches")
  public ResponseEntity<ApiResponse<BranchDto>> createBranch(
      @PathVariable UUID id, @Valid @RequestBody BranchCreateRequest request) {
    BranchDto dto = branchService.create(id, request);
    return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(dto));
  }
}
