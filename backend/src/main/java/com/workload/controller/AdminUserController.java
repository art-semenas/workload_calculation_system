package com.workload.controller;

import com.workload.dto.AdminUserCreateRequest;
import com.workload.dto.AdminUserDto;
import com.workload.dto.AdminUserPasswordRequest;
import com.workload.dto.AdminUserUpdateRequest;
import com.workload.dto.ApiResponse;
import com.workload.entity.Role;
import com.workload.service.AdminUserService;
import jakarta.validation.Valid;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** User administration (MVP M-02). Every route is admin only. */
@RestController
@RequestMapping("/api/v1/admin/users")
@PreAuthorize("hasRole('ADMIN')")
@RequiredArgsConstructor
public class AdminUserController {

  private final AdminUserService adminUserService;

  @GetMapping
  public ResponseEntity<ApiResponse<Page<AdminUserDto>>> getAll(
      @RequestParam(defaultValue = "0") int page,
      @RequestParam(defaultValue = "50") int size,
      @RequestParam(required = false) Role role,
      @RequestParam(name = "is_active", required = false) Boolean active) {
    return ResponseEntity.ok(
        ApiResponse.success(adminUserService.findAll(role, active, PageRequest.of(page, size))));
  }

  @PostMapping
  public ResponseEntity<ApiResponse<AdminUserDto>> create(
      @Valid @RequestBody AdminUserCreateRequest request) {
    AdminUserDto dto = adminUserService.create(request);
    return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(dto));
  }

  @GetMapping("/{id}")
  public ResponseEntity<ApiResponse<AdminUserDto>> getById(@PathVariable UUID id) {
    return ResponseEntity.ok(ApiResponse.success(adminUserService.findById(id)));
  }

  @PutMapping("/{id}")
  public ResponseEntity<ApiResponse<AdminUserDto>> update(
      @PathVariable UUID id, @Valid @RequestBody AdminUserUpdateRequest request) {
    return ResponseEntity.ok(ApiResponse.success(adminUserService.update(id, request)));
  }

  /** 204 with no body on purpose: nothing about a credential belongs in a response. */
  @PutMapping("/{id}/password")
  public ResponseEntity<Void> setPassword(
      @PathVariable UUID id, @Valid @RequestBody AdminUserPasswordRequest request) {
    adminUserService.setPassword(id, request);
    return ResponseEntity.noContent().build();
  }

  @PutMapping("/{id}/activate")
  public ResponseEntity<ApiResponse<AdminUserDto>> activate(@PathVariable UUID id) {
    return ResponseEntity.ok(ApiResponse.success(adminUserService.activate(id)));
  }

  @DeleteMapping("/{id}")
  public ResponseEntity<Void> deactivate(@PathVariable UUID id) {
    adminUserService.deactivate(id);
    return ResponseEntity.noContent().build();
  }
}
