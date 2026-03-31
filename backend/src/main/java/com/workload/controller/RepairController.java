package com.workload.controller;

import com.workload.dto.ApiResponse;
import com.workload.dto.RepairDto;
import com.workload.dto.RepairUpdateRequest;
import com.workload.service.RepairService;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/objects/{objectId}/repairs")
public class RepairController {

    private final RepairService repairService;

    public RepairController(RepairService repairService) {
        this.repairService = repairService;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<RepairDto>>> getAll(@PathVariable UUID objectId) {
        return ResponseEntity.ok(ApiResponse.success(repairService.getAll(objectId)));
    }

    @PutMapping("/{repairTypeId}")
    public ResponseEntity<ApiResponse<RepairDto>> update(
            @PathVariable UUID objectId,
            @PathVariable UUID repairTypeId,
            @Valid @RequestBody RepairUpdateRequest request) {
        return ResponseEntity.ok(
                ApiResponse.success(repairService.update(objectId, repairTypeId, request)));
    }
}
