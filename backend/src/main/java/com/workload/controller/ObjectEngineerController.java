package com.workload.controller;

import com.workload.dto.ApiResponse;
import com.workload.dto.EngineerObjectDto;
import com.workload.dto.EngineerShareDto;
import com.workload.dto.EngineerSummaryDto;
import com.workload.dto.ObjectEngineerAssignRequest;
import com.workload.dto.ObjectEngineerAssignmentDto;
import com.workload.exception.SummaryNotFoundException;
import com.workload.mapper.EngineerSummaryMapper;
import com.workload.repository.EngineerSummaryRepository;
import com.workload.service.ObjectEngineerService;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** REST controller for object-engineer assignment endpoints. */
@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
public class ObjectEngineerController {

  private final ObjectEngineerService objectEngineerService;
  private final EngineerSummaryRepository engineerSummaryRepository;
  private final EngineerSummaryMapper engineerSummaryMapper;

  // =========================================================================
  // Object-side endpoints
  // =========================================================================

  @GetMapping("/objects/{id}/engineers")
  public ResponseEntity<ApiResponse<List<EngineerShareDto>>> getEngineersForObject(
      @PathVariable UUID id) {
    List<EngineerShareDto> engineers = objectEngineerService.getEngineersForObject(id);
    return ResponseEntity.ok(ApiResponse.success(engineers));
  }

  @PostMapping("/objects/{id}/engineers")
  public ResponseEntity<ApiResponse<ObjectEngineerAssignmentDto>> assignEngineerToObject(
      @PathVariable UUID id, @Valid @RequestBody ObjectEngineerAssignRequest request) {
    ObjectEngineerAssignmentDto assignment =
        objectEngineerService.assignEngineerToObject(id, request.engineerId());
    return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(assignment));
  }

  @DeleteMapping("/objects/{id}/engineers/{eid}")
  public ResponseEntity<Void> removeEngineerFromObject(
      @PathVariable UUID id, @PathVariable("eid") UUID eid) {
    objectEngineerService.removeEngineerFromObject(id, eid);
    return ResponseEntity.noContent().build();
  }

  // =========================================================================
  // Engineer-side endpoints
  // =========================================================================

  @GetMapping("/engineers/{id}/objects")
  public ResponseEntity<ApiResponse<List<EngineerObjectDto>>> getObjectsForEngineer(
      @PathVariable UUID id) {
    List<EngineerObjectDto> objects = objectEngineerService.getObjectsForEngineer(id);
    return ResponseEntity.ok(ApiResponse.success(objects));
  }

  @PostMapping("/engineers/{id}/objects")
  public ResponseEntity<ApiResponse<ObjectEngineerAssignmentDto>> assignObjectToEngineer(
      @PathVariable UUID id, @Valid @RequestBody ObjectEngineerAssignRequest request) {
    ObjectEngineerAssignmentDto assignment =
        objectEngineerService.assignEngineerToObject(request.objectId(), id);
    return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(assignment));
  }

  @DeleteMapping("/engineers/{id}/objects/{oid}")
  public ResponseEntity<Void> removeObjectFromEngineer(
      @PathVariable UUID id, @PathVariable("oid") UUID oid) {
    objectEngineerService.removeEngineerFromObject(oid, id);
    return ResponseEntity.noContent().build();
  }

  @GetMapping("/engineers/{id}/summary")
  public ResponseEntity<ApiResponse<EngineerSummaryDto>> getEngineerSummary(@PathVariable UUID id) {
    var summary =
        engineerSummaryRepository
            .findByEngineerId(id)
            .orElseThrow(
                () ->
                    new SummaryNotFoundException("Engineer summary not found for engineer: " + id));

    return ResponseEntity.ok(ApiResponse.success(engineerSummaryMapper.toDto(summary)));
  }
}
