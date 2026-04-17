package com.workload.service;

import com.workload.dto.SvodRowDto;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.math.BigDecimal;
import java.util.List;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;

@Service
public class XlsxExportService {

  private static final String[] HEADERS = {
    "Object Name",
    "Division",
    "Branch",
    "Security (monthly avg)",
    "Fire (monthly avg)",
    "Video (monthly avg)",
    "Records (monthly)",
    "Repair without Travel (monthly)",
    "Repair with Travel (monthly)",
    "Round Trip Time (min)",
    "PZV (min)",
    "Total No Travel (min)",
    "TOTAL FTE (no travel)",
    "Total With Travel (min)",
    "TOTAL FTE (with travel)",
    "R1 per Visit Total",
    "R2 per Visit Total",
    "Calculation Date"
  };

  public byte[] exportSvod(List<SvodRowDto> rows) throws IOException {
    try (XSSFWorkbook workbook = new XSSFWorkbook()) {
      Sheet sheet = workbook.createSheet("Summary");

      // Header row
      Row headerRow = sheet.createRow(0);
      for (int i = 0; i < HEADERS.length; i++) {
        headerRow.createCell(i).setCellValue(HEADERS[i]);
      }

      // Data rows
      int rowNum = 1;
      for (SvodRowDto row : rows) {
        Row dataRow = sheet.createRow(rowNum++);
        // String columns
        dataRow.createCell(0).setCellValue(row.objectName() != null ? row.objectName() : "");
        dataRow.createCell(1).setCellValue(row.divisionName() != null ? row.divisionName() : "");
        dataRow.createCell(2).setCellValue(row.branchName() != null ? row.branchName() : "");
        // Numeric columns
        dataRow.createCell(3).setCellValue(numericValue(row.osMonthlyAvg()));
        dataRow.createCell(4).setCellValue(numericValue(row.psMonthlyAvg()));
        dataRow.createCell(5).setCellValue(numericValue(row.videoMonthlyAvg()));
        dataRow.createCell(6).setCellValue(numericValue(row.recordsMonthly()));
        dataRow.createCell(7).setCellValue(numericValue(row.repairNoTravelMonthly()));
        dataRow.createCell(8).setCellValue(numericValue(row.repairWithTravelMonthly()));
        dataRow.createCell(9).setCellValue(numericValue(row.roundTripMin()));
        dataRow.createCell(10).setCellValue(numericValue(row.pzvMinutes()));
        dataRow.createCell(11).setCellValue(numericValue(row.totalNoTravelMin()));
        dataRow.createCell(12).setCellValue(numericValue(row.itogoChisloNoTravel()));
        dataRow.createCell(13).setCellValue(numericValue(row.totalWithTravelMin()));
        dataRow.createCell(14).setCellValue(numericValue(row.itogoChisloWithTravel()));
        dataRow.createCell(15).setCellValue(numericValue(row.r1PerVisitTotal()));
        dataRow.createCell(16).setCellValue(numericValue(row.r2PerVisitTotal()));
        // Date column
        dataRow
            .createCell(17)
            .setCellValue(
                row.computedAt() != null ? row.computedAt().toLocalDate().toString() : "");
      }

      // Auto-size all columns
      for (int i = 0; i < HEADERS.length; i++) {
        sheet.autoSizeColumn(i);
      }

      ByteArrayOutputStream out = new ByteArrayOutputStream();
      workbook.write(out);
      return out.toByteArray();
    }
  }

  private double numericValue(BigDecimal value) {
    return value != null ? value.doubleValue() : 0.0;
  }
}
