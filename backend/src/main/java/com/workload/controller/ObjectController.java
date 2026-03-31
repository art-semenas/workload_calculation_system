package com.workload.controller;

import com.workload.dto.ApiResponse;
import com.workload.dto.ObjectCreateRequest;
import com.workload.dto.ObjectDto;
import com.workload.dto.ObjectUpdateRequest;
import com.workload.dto.SummaryDto;
import com.workload.service.ObjectService;
import jakarta.validation.Valid;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/objects")
public class ObjectController {

  private final ObjectService objectService;

  public ObjectController(ObjectService objectService) {
    this.objectService = objectService;
  }

  @GetMapping
  public ResponseEntity<ApiResponse<List<ObjectDto>>> getAll(
      @RequestParam(name = "division_id", required = false) UUID divisionId) {
    return ResponseEntity.ok(
        ApiResponse.success(objectService.findAll(Optional.ofNullable(divisionId))));
  }

  @PostMapping
  public ResponseEntity<ApiResponse<ObjectDto>> create(
      @Valid @RequestBody ObjectCreateRequest request) {
    ObjectDto dto = objectService.create(request);
    return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(dto));
  }

  @GetMapping("/{id}")
  public ResponseEntity<ApiResponse<ObjectDto>> getById(@PathVariable UUID id) {
    return ResponseEntity.ok(ApiResponse.success(objectService.findById(id)));
  }

  @PutMapping("/{id}")
  public ResponseEntity<ApiResponse<ObjectDto>> update(
      @PathVariable UUID id, @Valid @RequestBody ObjectUpdateRequest request) {
    return ResponseEntity.ok(ApiResponse.success(objectService.update(id, request)));
  }

  @DeleteMapping("/{id}")
  public ResponseEntity<Void> delete(@PathVariable UUID id) {
    objectService.delete(id);
    return ResponseEntity.noContent().build();
  }

  @GetMapping("/{id}/summary")
  public ResponseEntity<ApiResponse<SummaryDto>> getObjectSummary(@PathVariable UUID id) {
    SummaryDto summary = objectService.getSummary(id);
    return ResponseEntity.ok(ApiResponse.success(summary));
  }
}
