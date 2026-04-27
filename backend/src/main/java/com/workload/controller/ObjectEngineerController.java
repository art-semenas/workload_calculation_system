package com.workload.controller;

import com.workload.dto.ApiResponse;
import com.workload.dto.EngineerObjectDto;
import com.workload.dto.EngineerShareDto;
import com.workload.dto.EngineerSummaryDto;
import com.workload.dto.ObjectEngineerAssignRequest;
import com.workload.entity.ObjectEngineer;
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

/**
 * REST controller for object-engineer assignment endpoints. Provides mirrored endpoints for
 * assigning engineers to objects and retrieving assignments.
 */
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

  /**
   * GET /api/v1/objects/{id}/engineers - Retrieve all engineers assigned to an object with their
   * shares.
   *
   * @param id the object ID
   * @return list of engineers with their objectShare for this object
   */
  @GetMapping("/objects/{id}/engineers")
  public ResponseEntity<ApiResponse<List<EngineerShareDto>>> getEngineersForObject(
      @PathVariable UUID id) {
    List<EngineerShareDto> engineers = objectEngineerService.getEngineersForObject(id);
    return ResponseEntity.ok(ApiResponse.success(engineers));
  }

  /**
   * POST /api/v1/objects/{id}/engineers - Assign an engineer to an object.
   *
   * @param id the object ID
   * @param request containing engineerId
   * @return the created ObjectEngineer assignment
   */
  @PostMapping("/objects/{id}/engineers")
  public ResponseEntity<ApiResponse<ObjectEngineer>> assignEngineerToObject(
      @PathVariable UUID id, @Valid @RequestBody ObjectEngineerAssignRequest request) {
    ObjectEngineer assignment =
        objectEngineerService.assignEngineerToObject(id, request.engineerId());
    return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(assignment));
  }

  /**
   * DELETE /api/v1/objects/{id}/engineers/{eid} - Remove an engineer from an object.
   *
   * @param id the object ID
   * @param eid the engineer ID
   * @return 204 No Content
   */
  @DeleteMapping("/objects/{id}/engineers/{eid}")
  public ResponseEntity<Void> removeEngineerFromObject(
      @PathVariable UUID id, @PathVariable("eid") UUID eid) {
    objectEngineerService.removeEngineerFromObject(id, eid);
    return ResponseEntity.noContent().build();
  }

  // =========================================================================
  // Engineer-side endpoints
  // =========================================================================

  /**
   * GET /api/v1/engineers/{id}/objects - Retrieve all objects assigned to an engineer with their
   * shares.
   *
   * @param id the engineer ID
   * @return list of objects with the engineer's share on each
   */
  @GetMapping("/engineers/{id}/objects")
  public ResponseEntity<ApiResponse<List<EngineerObjectDto>>> getObjectsForEngineer(
      @PathVariable UUID id) {
    List<EngineerObjectDto> objects = objectEngineerService.getObjectsForEngineer(id);
    return ResponseEntity.ok(ApiResponse.success(objects));
  }

  /**
   * POST /api/v1/engineers/{id}/objects - Assign an engineer to an object (mirror endpoint).
   *
   * @param id the engineer ID
   * @param request containing objectId
   * @return the created ObjectEngineer assignment
   */
  @PostMapping("/engineers/{id}/objects")
  public ResponseEntity<ApiResponse<ObjectEngineer>> assignObjectToEngineer(
      @PathVariable UUID id, @Valid @RequestBody ObjectEngineerAssignRequest request) {
    ObjectEngineer assignment =
        objectEngineerService.assignEngineerToObject(request.objectId(), id);
    return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(assignment));
  }

  /**
   * DELETE /api/v1/engineers/{id}/objects/{oid} - Remove an object assignment from an engineer
   * (mirror endpoint).
   *
   * @param id the engineer ID
   * @param oid the object ID
   * @return 204 No Content
   */
  @DeleteMapping("/engineers/{id}/objects/{oid}")
  public ResponseEntity<Void> removeObjectFromEngineer(
      @PathVariable UUID id, @PathVariable("oid") UUID oid) {
    objectEngineerService.removeEngineerFromObject(oid, id);
    return ResponseEntity.noContent().build();
  }

  /**
   * GET /api/v1/engineers/{id}/summary - Retrieve the engineer summary with aggregated workload
   * metrics.
   *
   * @param id the engineer ID
   * @return the engineer summary DTO
   * @throws SummaryNotFoundException if engineer summary does not exist
   */
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
