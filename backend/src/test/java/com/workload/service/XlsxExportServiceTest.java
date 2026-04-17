package com.workload.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.within;

import com.workload.dto.SvodRowDto;
import java.io.ByteArrayInputStream;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class XlsxExportServiceTest {

  private XlsxExportService service;

  @BeforeEach
  void setUp() {
    service = new XlsxExportService();
  }

  private SvodRowDto buildRow(BigDecimal itogoChisloWithTravel) {
    return new SvodRowDto(
        UUID.randomUUID(),
        "Test Object",
        null,
        "Test Division",
        "Test Branch",
        new BigDecimal("10.00"),
        new BigDecimal("5.00"),
        new BigDecimal("3.00"),
        new BigDecimal("2.00"),
        new BigDecimal("100.00"),
        new BigDecimal("120.00"),
        new BigDecimal("60.00"),
        new BigDecimal("15.00"),
        new BigDecimal("135.00"),
        new BigDecimal("0.015000"),
        new BigDecimal("155.00"),
        itogoChisloWithTravel,
        new BigDecimal("50.00"),
        new BigDecimal("25.00"),
        OffsetDateTime.now());
  }

  @Test
  void exportSvod_producesValidWorkbook() throws Exception {
    List<SvodRowDto> rows =
        List.of(
            buildRow(new BigDecimal("0.032327")),
            buildRow(new BigDecimal("0.020000")),
            buildRow(new BigDecimal("0.010000")));

    byte[] bytes = service.exportSvod(rows);

    try (XSSFWorkbook wb = new XSSFWorkbook(new ByteArrayInputStream(bytes))) {
      Sheet sheet = wb.getSheetAt(0);
      assertThat(sheet.getSheetName()).isEqualTo("Summary");
      assertThat(sheet.getPhysicalNumberOfRows()).isEqualTo(4);

      Row header = sheet.getRow(0);
      assertThat(header.getCell(0).getStringCellValue()).isEqualTo("Object Name");

      // itogoChisloWithTravel is column index 14 (0-based, after skipping objectId)
      Row dataRow = sheet.getRow(1);
      double fteValue = dataRow.getCell(15).getNumericCellValue();
      assertThat(fteValue).isCloseTo(0.032327, within(0.000001));
    }
  }

  @Test
  void exportSvod_hasAddressColumn() throws Exception {
    List<SvodRowDto> rows = List.of(buildRow(new BigDecimal("0.010000")));

    byte[] bytes = service.exportSvod(rows);

    try (XSSFWorkbook wb = new XSSFWorkbook(new ByteArrayInputStream(bytes))) {
      Sheet sheet = wb.getSheetAt(0);
      Row header = sheet.getRow(0);
      assertThat(header.getCell(1).getStringCellValue()).isEqualTo("Address");
    }
  }

  @Test
  void exportSvod_emptyList_producesHeaderOnly() throws Exception {
    byte[] bytes = service.exportSvod(List.of());

    try (XSSFWorkbook wb = new XSSFWorkbook(new ByteArrayInputStream(bytes))) {
      Sheet sheet = wb.getSheetAt(0);
      assertThat(sheet.getPhysicalNumberOfRows()).isEqualTo(1);
    }
  }

  @Test
  void exportSvod_numericPrecision() throws Exception {
    List<SvodRowDto> rows = List.of(buildRow(new BigDecimal("0.032327")));

    byte[] bytes = service.exportSvod(rows);

    try (XSSFWorkbook wb = new XSSFWorkbook(new ByteArrayInputStream(bytes))) {
      Sheet sheet = wb.getSheetAt(0);
      Row dataRow = sheet.getRow(1);
      double fteValue = dataRow.getCell(15).getNumericCellValue();
      assertThat(fteValue).isCloseTo(0.032327, within(0.000001));
    }
  }
}
