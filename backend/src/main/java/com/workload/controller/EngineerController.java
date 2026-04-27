package com.workload.controller;

import com.workload.dto.ApiResponse;
import com.workload.dto.EngineerCreateRequest;
import com.workload.dto.EngineerDto;
import com.workload.dto.EngineerUpdateRequest;
import com.workload.service.EngineerService;
import jakarta.validation.Valid;
import java.util.List;
import java.util.Optional;
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
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/engineers")
public class EngineerController {

  private final EngineerService engineerService;

  public EngineerController(EngineerService engineerService) {
    this.engineerService = engineerService;
  }

  @GetMapping
  public ResponseEntity<ApiResponse<List<EngineerDto>>> getAll(
      @RequestParam(required = false) String status,
      @RequestParam(name = "home_division_id", required = false) UUID homeDivisionId) {
    return ResponseEntity.ok(
        ApiResponse.success(
            engineerService.findAll(
                Optional.ofNullable(status), Optional.ofNullable(homeDivisionId))));
  }

  @PostMapping
  public ResponseEntity<ApiResponse<EngineerDto>> create(
      @Valid @RequestBody EngineerCreateRequest request) {
    EngineerDto dto = engineerService.create(request);
    return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(dto));
  }

  @GetMapping("/{id}")
  public ResponseEntity<ApiResponse<EngineerDto>> getById(@PathVariable UUID id) {
    return ResponseEntity.ok(ApiResponse.success(engineerService.findById(id)));
  }

  @PutMapping("/{id}")
  public ResponseEntity<ApiResponse<EngineerDto>> update(
      @PathVariable UUID id, @Valid @RequestBody EngineerUpdateRequest request) {
    return ResponseEntity.ok(ApiResponse.success(engineerService.update(id, request)));
  }

  @DeleteMapping("/{id}")
  public ResponseEntity<Void> deactivate(@PathVariable UUID id) {
    engineerService.deactivate(id);
    return ResponseEntity.noContent().build();
  }
}
