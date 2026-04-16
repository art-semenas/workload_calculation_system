package com.workload.controller;

import com.workload.dto.ApiResponse;
import com.workload.dto.SvodRowDto;
import com.workload.service.SvodService;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/svod")
public class SvodController {

  private final SvodService svodService;

  public SvodController(SvodService svodService) {
    this.svodService = svodService;
  }

  @GetMapping
  public ResponseEntity<ApiResponse<Page<SvodRowDto>>> getSvod(
      @RequestParam(defaultValue = "0") int page,
      @RequestParam(defaultValue = "100") int size,
      @RequestParam(name = "division_id", required = false) UUID divisionId) {
    Page<SvodRowDto> result = svodService.getSvod(PageRequest.of(page, size), divisionId);
    return ResponseEntity.ok(ApiResponse.success(result));
  }
}
