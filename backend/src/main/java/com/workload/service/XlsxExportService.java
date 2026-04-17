package com.workload.service;

import com.workload.dto.SvodRowDto;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;

@Service
public class XlsxExportService {

  private static final String[] HEADERS = {
    "Object Name",
    "Address",
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
        dataRow.createCell(1).setCellValue(row.address() != null ? row.address() : "");
        dataRow.createCell(2).setCellValue(row.divisionName() != null ? row.divisionName() : "");
        dataRow.createCell(3).setCellValue(row.branchName() != null ? row.branchName() : "");
        // Numeric columns — minute/average fields use scale 2
        dataRow.createCell(4).setCellValue(scaledDouble(row.osMonthlyAvg(), 2));
        dataRow.createCell(5).setCellValue(scaledDouble(row.psMonthlyAvg(), 2));
        dataRow.createCell(6).setCellValue(scaledDouble(row.videoMonthlyAvg(), 2));
        dataRow.createCell(7).setCellValue(scaledDouble(row.recordsMonthly(), 2));
        dataRow.createCell(8).setCellValue(scaledDouble(row.repairNoTravelMonthly(), 2));
        dataRow.createCell(9).setCellValue(scaledDouble(row.repairWithTravelMonthly(), 2));
        dataRow.createCell(10).setCellValue(scaledDouble(row.roundTripMin(), 2));
        dataRow.createCell(11).setCellValue(scaledDouble(row.pzvMinutes(), 2));
        dataRow.createCell(12).setCellValue(scaledDouble(row.totalNoTravelMin(), 2));
        // FTE fields use scale 6
        dataRow.createCell(13).setCellValue(scaledDouble(row.itogoChisloNoTravel(), 6));
        dataRow.createCell(14).setCellValue(scaledDouble(row.totalWithTravelMin(), 2));
        dataRow.createCell(15).setCellValue(scaledDouble(row.itogoChisloWithTravel(), 6));
        dataRow.createCell(16).setCellValue(scaledDouble(row.r1PerVisitTotal(), 2));
        dataRow.createCell(17).setCellValue(scaledDouble(row.r2PerVisitTotal(), 2));
        // Date column
        dataRow
            .createCell(18)
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

  private double scaledDouble(BigDecimal value, int scale) {
    return value != null ? value.setScale(scale, RoundingMode.HALF_UP).doubleValue() : 0.0;
  }
}
