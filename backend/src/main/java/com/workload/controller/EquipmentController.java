package com.workload.controller;

import com.workload.dto.ApiResponse;
import com.workload.dto.AssignmentCreateRequest;
import com.workload.dto.AssignmentDto;
import com.workload.dto.AssignmentUpdateRequest;
import com.workload.dto.ObjectDeviceDto;
import com.workload.dto.ObjectDeviceUpsertRequest;
import com.workload.service.EquipmentService;
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
@RequestMapping("/api/v1/objects/{objectId}")
public class EquipmentController {

    private final EquipmentService equipmentService;

    public EquipmentController(EquipmentService equipmentService) {
        this.equipmentService = equipmentService;
    }

    @GetMapping("/devices")
    public ResponseEntity<ApiResponse<List<ObjectDeviceDto>>> getDevices(
            @PathVariable UUID objectId) {
        return ResponseEntity.ok(ApiResponse.success(equipmentService.getDevices(objectId)));
    }

    @PostMapping("/devices")
    public ResponseEntity<ApiResponse<ObjectDeviceDto>> upsertDevice(
            @PathVariable UUID objectId,
            @Valid @RequestBody ObjectDeviceUpsertRequest request) {
        ObjectDeviceDto dto = equipmentService.upsertDevice(objectId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(dto));
    }

    @PutMapping("/devices/{deviceTypeId}")
    public ResponseEntity<ApiResponse<ObjectDeviceDto>> updateDevice(
            @PathVariable UUID objectId,
            @PathVariable UUID deviceTypeId,
            @Valid @RequestBody ObjectDeviceUpsertRequest request) {
        ObjectDeviceDto dto = equipmentService.upsertDevice(objectId, request);
        return ResponseEntity.ok(ApiResponse.success(dto));
    }

    @DeleteMapping("/devices/{deviceTypeId}")
    public ResponseEntity<Void> deleteDevice(
            @PathVariable UUID objectId, @PathVariable UUID deviceTypeId) {
        equipmentService.deleteDevice(objectId, deviceTypeId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/assignments")
    public ResponseEntity<ApiResponse<List<AssignmentDto>>> getAssignments(
            @PathVariable UUID objectId) {
        return ResponseEntity.ok(ApiResponse.success(equipmentService.getAssignments(objectId)));
    }

    @PostMapping("/assignments")
    public ResponseEntity<ApiResponse<AssignmentDto>> addAssignment(
            @PathVariable UUID objectId,
            @Valid @RequestBody AssignmentCreateRequest request) {
        AssignmentDto dto = equipmentService.addAssignment(objectId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(dto));
    }

    @PutMapping("/assignments/{assignmentId}")
    public ResponseEntity<ApiResponse<AssignmentDto>> updateAssignment(
            @PathVariable UUID objectId,
            @PathVariable UUID assignmentId,
            @Valid @RequestBody AssignmentUpdateRequest request) {
        return ResponseEntity.ok(
                ApiResponse.success(equipmentService.updateAssignment(assignmentId, request)));
    }

    @DeleteMapping("/assignments/{assignmentId}")
    public ResponseEntity<Void> deleteAssignment(
            @PathVariable UUID objectId, @PathVariable UUID assignmentId) {
        equipmentService.deleteAssignment(assignmentId);
        return ResponseEntity.noContent().build();
    }
}
