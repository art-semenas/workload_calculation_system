package com.workload.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.workload.dto.ApiResponse;
import com.workload.dto.TravelDto;
import com.workload.dto.TravelUpdateRequest;
import com.workload.exception.RoundTripNotEditableException;
import com.workload.service.TravelService;
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

  public TravelController(TravelService travelService) {
    this.travelService = travelService;
  }

  @GetMapping
  public ResponseEntity<ApiResponse<TravelDto>> get(@PathVariable UUID objectId) {
    return ResponseEntity.ok(ApiResponse.success(travelService.get(objectId)));
  }

  @PutMapping
  public ResponseEntity<ApiResponse<TravelDto>> update(
      @PathVariable UUID objectId, @RequestBody JsonNode rawBody) {
    // Reject if round_trip_min or roundTripMin is present in the request
    if (rawBody.has("roundTripMin") || rawBody.has("round_trip_min")) {
      throw new RoundTripNotEditableException();
    }

    TravelUpdateRequest request =
        new TravelUpdateRequest(
            rawBody.has("transportType") ? rawBody.get("transportType").asText() : null,
            new java.math.BigDecimal(rawBody.get("distanceKm").asText()),
            new java.math.BigDecimal(rawBody.get("oneWayTimeMin").asText()));

    return ResponseEntity.ok(ApiResponse.success(travelService.update(objectId, request)));
  }
}
