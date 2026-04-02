package com.workload.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.workload.dto.ApiError;
import com.workload.dto.ApiResponse;
import com.workload.dto.TravelDto;
import com.workload.dto.TravelUpdateRequest;
import com.workload.exception.RoundTripNotEditableException;
import com.workload.service.TravelService;
import java.math.BigDecimal;
import java.util.UUID;
import org.springframework.http.HttpStatus;
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

    // Validate required fields are present
    if (!rawBody.hasNonNull("distanceKm") || !rawBody.hasNonNull("oneWayTimeMin")) {
      return ResponseEntity.status(HttpStatus.UNPROCESSABLE_ENTITY)
          .body(
              ApiResponse.error(
                  new ApiError("VALIDATION_ERROR", "distanceKm and oneWayTimeMin are required", null)));
    }

    BigDecimal distanceKm;
    BigDecimal oneWayTimeMin;
    try {
      distanceKm = new BigDecimal(rawBody.get("distanceKm").asText());
      oneWayTimeMin = new BigDecimal(rawBody.get("oneWayTimeMin").asText());
    } catch (NumberFormatException e) {
      return ResponseEntity.status(HttpStatus.UNPROCESSABLE_ENTITY)
          .body(
              ApiResponse.error(
                  new ApiError("VALIDATION_ERROR", "distanceKm and oneWayTimeMin must be numeric", null)));
    }

    String transportType =
        rawBody.hasNonNull("transportType") ? rawBody.get("transportType").asText() : null;
    TravelUpdateRequest request = new TravelUpdateRequest(transportType, distanceKm, oneWayTimeMin);

    return ResponseEntity.ok(ApiResponse.success(travelService.update(objectId, request)));
  }
}
