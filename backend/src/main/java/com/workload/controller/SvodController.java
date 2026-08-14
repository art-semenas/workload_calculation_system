package com.workload.controller;

import com.workload.dto.ApiResponse;
import com.workload.dto.SvodRowDto;
import com.workload.security.RbacService;
import com.workload.service.SvodService;
import com.workload.service.XlsxExportService;
import java.io.IOException;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/svod")
public class SvodController {

  private final SvodService svodService;
  private final XlsxExportService xlsxExportService;
  private final RbacService rbacService;

  public SvodController(
      SvodService svodService, XlsxExportService xlsxExportService, RbacService rbacService) {
    this.svodService = svodService;
    this.xlsxExportService = xlsxExportService;
    this.rbacService = rbacService;
  }

  @GetMapping
  public ResponseEntity<ApiResponse<Page<SvodRowDto>>> getSvod(
      @RequestParam(defaultValue = "0") int page,
      @RequestParam(defaultValue = "100") int size,
      @RequestParam(name = "division_id", required = false) UUID divisionId) {
    Page<SvodRowDto> result =
        svodService.getSvod(
            PageRequest.of(page, size), divisionId, rbacService.readScopeEngineerId().orElse(null));
    return ResponseEntity.ok(ApiResponse.success(result));
  }

  @GetMapping("/export/xlsx")
  public ResponseEntity<byte[]> exportXlsx(
      @RequestParam(name = "division_id", required = false) UUID divisionId) throws IOException {
    List<SvodRowDto> rows =
        svodService.getAllForExport(divisionId, rbacService.readScopeEngineerId().orElse(null));
    byte[] xlsx = xlsxExportService.exportSvod(rows);
    return ResponseEntity.ok()
        .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=svod.xlsx")
        .contentType(
            MediaType.parseMediaType(
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
        .body(xlsx);
  }
}
