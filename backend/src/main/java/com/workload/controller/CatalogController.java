package com.workload.controller;

import com.workload.dto.ApiResponse;
import com.workload.dto.DeviceSystemContextCreateRequest;
import com.workload.dto.DeviceSystemContextDto;
import com.workload.dto.DeviceSystemContextUpdateRequest;
import com.workload.dto.DeviceTypeCreateRequest;
import com.workload.dto.DeviceTypeDto;
import com.workload.dto.DeviceTypeUpdateRequest;
import com.workload.dto.RepairTypeCreateRequest;
import com.workload.dto.RepairTypeDto;
import com.workload.dto.RepairTypeUpdateRequest;
import com.workload.service.CatalogService;
import jakarta.validation.Valid;
import java.util.List;
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
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/catalog")
public class CatalogController {

  private final CatalogService catalogService;

  public CatalogController(CatalogService catalogService) {
    this.catalogService = catalogService;
  }

  @GetMapping("/devices")
  public ResponseEntity<ApiResponse<List<DeviceTypeDto>>> getAllDeviceTypes() {
    return ResponseEntity.ok(ApiResponse.success(catalogService.getAllDeviceTypes()));
  }

  @GetMapping("/devices/{id}")
  public ResponseEntity<ApiResponse<DeviceTypeDto>> getDeviceType(@PathVariable UUID id) {
    return ResponseEntity.ok(ApiResponse.success(catalogService.getDeviceType(id)));
  }

  @GetMapping("/devices/{id}/contexts")
  public ResponseEntity<ApiResponse<List<DeviceSystemContextDto>>> getContexts(
      @PathVariable UUID id) {
    return ResponseEntity.ok(ApiResponse.success(catalogService.getContextsForDevice(id)));
  }

  @PostMapping("/devices")
  public ResponseEntity<ApiResponse<DeviceTypeDto>> createDeviceType(
      @Valid @RequestBody DeviceTypeCreateRequest request) {
    return ResponseEntity.status(HttpStatus.CREATED)
        .body(ApiResponse.success(catalogService.createDeviceType(request)));
  }

  @PutMapping("/devices/{id}")
  public ResponseEntity<ApiResponse<DeviceTypeDto>> updateDeviceType(
      @PathVariable UUID id, @Valid @RequestBody DeviceTypeUpdateRequest request) {
    return ResponseEntity.ok(ApiResponse.success(catalogService.updateDeviceType(id, request)));
  }

  @DeleteMapping("/devices/{id}")
  public ResponseEntity<Void> deleteDeviceType(@PathVariable UUID id) {
    catalogService.deleteDeviceType(id);
    return ResponseEntity.noContent().build();
  }

  @PostMapping("/devices/{deviceTypeId}/contexts")
  public ResponseEntity<ApiResponse<DeviceSystemContextDto>> createContext(
      @PathVariable UUID deviceTypeId,
      @Valid @RequestBody DeviceSystemContextCreateRequest request) {
    return ResponseEntity.status(HttpStatus.CREATED)
        .body(ApiResponse.success(catalogService.createContext(deviceTypeId, request)));
  }

  @PutMapping("/devices/{deviceTypeId}/contexts/{contextId}")
  public ResponseEntity<ApiResponse<DeviceSystemContextDto>> updateContext(
      @PathVariable UUID deviceTypeId,
      @PathVariable UUID contextId,
      @Valid @RequestBody DeviceSystemContextUpdateRequest request) {
    return ResponseEntity.ok(
        ApiResponse.success(catalogService.updateContext(deviceTypeId, contextId, request)));
  }

  @DeleteMapping("/devices/{deviceTypeId}/contexts/{contextId}")
  public ResponseEntity<Void> deleteContext(
      @PathVariable UUID deviceTypeId, @PathVariable UUID contextId) {
    catalogService.deleteContext(deviceTypeId, contextId);
    return ResponseEntity.noContent().build();
  }

  @GetMapping("/repairs")
  public ResponseEntity<ApiResponse<List<RepairTypeDto>>> getAllRepairTypes() {
    return ResponseEntity.ok(ApiResponse.success(catalogService.getAllRepairTypes()));
  }

  @PostMapping("/repairs")
  public ResponseEntity<ApiResponse<RepairTypeDto>> createRepairType(
      @Valid @RequestBody RepairTypeCreateRequest request) {
    return ResponseEntity.status(HttpStatus.CREATED)
        .body(ApiResponse.success(catalogService.createRepairType(request)));
  }

  @PutMapping("/repairs/{id}")
  public ResponseEntity<ApiResponse<RepairTypeDto>> updateRepairType(
      @PathVariable UUID id, @Valid @RequestBody RepairTypeUpdateRequest request) {
    return ResponseEntity.ok(ApiResponse.success(catalogService.updateRepairType(id, request)));
  }

  @DeleteMapping("/repairs/{id}")
  public ResponseEntity<Void> deleteRepairType(@PathVariable UUID id) {
    catalogService.deleteRepairType(id);
    return ResponseEntity.noContent().build();
  }
}
