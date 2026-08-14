package com.workload.controller;

import com.workload.dto.ApiResponse;
import com.workload.dto.BranchDto;
import com.workload.dto.BranchUpdateRequest;
import com.workload.service.BranchService;
import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/branches")
public class BranchController {

  private final BranchService branchService;

  public BranchController(BranchService branchService) {
    this.branchService = branchService;
  }

  @GetMapping("/{id}")
  public ResponseEntity<ApiResponse<BranchDto>> getById(@PathVariable UUID id) {
    return ResponseEntity.ok(ApiResponse.success(branchService.findById(id)));
  }

  @PreAuthorize("hasRole('ADMIN')")
  @PutMapping("/{id}")
  public ResponseEntity<ApiResponse<BranchDto>> update(
      @PathVariable UUID id, @Valid @RequestBody BranchUpdateRequest request) {
    return ResponseEntity.ok(ApiResponse.success(branchService.update(id, request)));
  }

  @PreAuthorize("hasRole('ADMIN')")
  @DeleteMapping("/{id}")
  public ResponseEntity<Void> delete(@PathVariable UUID id) {
    branchService.delete(id);
    return ResponseEntity.noContent().build();
  }
}
