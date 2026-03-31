package com.workload.controller;

import com.workload.dto.ApiResponse;
import com.workload.dto.RecordsDto;
import com.workload.dto.RecordsUpdateRequest;
import com.workload.service.RecordsService;
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
@RequestMapping("/api/v1/objects/{objectId}/records")
public class RecordsController {

    private final RecordsService recordsService;

    public RecordsController(RecordsService recordsService) {
        this.recordsService = recordsService;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<RecordsDto>> get(@PathVariable UUID objectId) {
        return ResponseEntity.ok(ApiResponse.success(recordsService.get(objectId)));
    }

    @PutMapping
    public ResponseEntity<ApiResponse<RecordsDto>> update(
            @PathVariable UUID objectId, @Valid @RequestBody RecordsUpdateRequest request) {
        return ResponseEntity.ok(ApiResponse.success(recordsService.update(objectId, request)));
    }
}
