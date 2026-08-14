package com.workload.controller;

import com.workload.dto.ApiResponse;
import com.workload.dto.TravelDto;
import com.workload.dto.TravelUpdateRequest;
import com.workload.exception.RoundTripNotEditableException;
import com.workload.security.RbacService;
import com.workload.service.TravelService;
import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/objects/{objectId}/travel")
public class TravelController {

  private final TravelService travelService;
  private final RbacService rbacService;

  public TravelController(TravelService travelService, RbacService rbacService) {
    this.travelService = travelService;
    this.rbacService = rbacService;
  }

  @GetMapping
  public ResponseEntity<ApiResponse<TravelDto>> get(@PathVariable UUID objectId) {
    return ResponseEntity.ok(ApiResponse.success(travelService.get(objectId)));
  }

  @PutMapping
  public ResponseEntity<ApiResponse<TravelDto>> update(
      @PathVariable UUID objectId, @Valid @RequestBody TravelUpdateRequest request) {
    rbacService.requireCanWriteObject(objectId);
    // round_trip_min is computed server-side and must never be set by clients (TOR §8.3)
    if (request.roundTripMin() != null) {
      throw new RoundTripNotEditableException();
    }
    return ResponseEntity.ok(ApiResponse.success(travelService.update(objectId, request)));
  }
}
