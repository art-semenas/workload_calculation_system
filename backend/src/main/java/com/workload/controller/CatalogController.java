package com.workload.controller;

import com.workload.dto.ApiResponse;
import com.workload.dto.DeviceSystemContextDto;
import com.workload.dto.DeviceTypeDto;
import com.workload.dto.RepairTypeDto;
import com.workload.service.CatalogService;
import java.util.List;
import java.util.UUID;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/catalog")
public class CatalogController {

    private final CatalogService catalogService;

    public CatalogController(CatalogService catalogService) {
        this.catalogService = catalogService;
    }

    @GetMapping("/device-types")
    public ResponseEntity<ApiResponse<List<DeviceTypeDto>>> getAllDeviceTypes() {
        return ResponseEntity.ok(ApiResponse.success(catalogService.getAllDeviceTypes()));
    }

    @GetMapping("/device-types/{id}")
    public ResponseEntity<ApiResponse<DeviceTypeDto>> getDeviceType(@PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.success(catalogService.getDeviceType(id)));
    }

    @GetMapping("/device-types/{id}/contexts")
    public ResponseEntity<ApiResponse<List<DeviceSystemContextDto>>> getContexts(
            @PathVariable UUID id) {
        return ResponseEntity.ok(
                ApiResponse.success(catalogService.getContextsForDevice(id)));
    }

    @GetMapping("/repair-types")
    public ResponseEntity<ApiResponse<List<RepairTypeDto>>> getAllRepairTypes() {
        return ResponseEntity.ok(ApiResponse.success(catalogService.getAllRepairTypes()));
    }
}
