package com.workload.controller;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.greaterThanOrEqualTo;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.notNullValue;

import com.workload.dto.AssignmentCreateRequest;
import com.workload.dto.ObjectDeviceUpsertRequest;
import com.workload.entity.Branch;
import com.workload.entity.DeviceSystemContext;
import com.workload.entity.DeviceType;
import com.workload.entity.Division;
import com.workload.entity.ObjectEntity;
import com.workload.entity.SystemType;
import com.workload.repository.BranchRepository;
import com.workload.repository.DeviceSystemContextRepository;
import com.workload.repository.DeviceTypeRepository;
import com.workload.repository.DivisionRepository;
import com.workload.repository.ObjectRepository;
import com.workload.service.EquipmentService;
import com.workload.support.IntegrationTestBase;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

class SvodControllerIT extends IntegrationTestBase {

  @Autowired private DivisionRepository divisionRepository;
  @Autowired private BranchRepository branchRepository;
  @Autowired private ObjectRepository objectRepository;
  @Autowired private DeviceTypeRepository deviceTypeRepository;
  @Autowired private DeviceSystemContextRepository deviceSystemContextRepository;
  @Autowired private EquipmentService equipmentService;

  private String bearerToken;
  private String objectId;
  private String divisionId;

  @BeforeEach
  void setUp() {
    bearerToken = authenticationTestHelper.loginAsAdmin();

    // Create division → branch → object → device + assignment → triggers recalculation
    Division division =
        Division.builder()
            .id(UUID.randomUUID())
            .name("SvodIT-Div-" + UUID.randomUUID().toString().substring(0, 8))
            .createdAt(OffsetDateTime.now())
            .updatedAt(OffsetDateTime.now())
            .build();
    divisionRepository.saveAndFlush(division);
    divisionId = division.getId().toString();

    Branch branch =
        Branch.builder()
            .id(UUID.randomUUID())
            .division(division)
            .name("SvodIT-Branch")
            .createdAt(OffsetDateTime.now())
            .updatedAt(OffsetDateTime.now())
            .build();
    branchRepository.saveAndFlush(branch);

    ObjectEntity object =
        ObjectEntity.builder()
            .id(UUID.randomUUID())
            .branch(branch)
            .name("SvodIT-Object")
            .createdAt(OffsetDateTime.now())
            .updatedAt(OffsetDateTime.now())
            .build();
    objectRepository.saveAndFlush(object);
    objectId = object.getId().toString();

    // Create device type + context, then add device + assignment to trigger recalculation
    DeviceType deviceType =
        DeviceType.builder()
            .id(UUID.randomUUID())
            .name("SvodIT-Device-" + UUID.randomUUID().toString().substring(0, 8))
            .description("Test device for svod IT")
            .createdAt(OffsetDateTime.now())
            .updatedAt(OffsetDateTime.now())
            .build();
    deviceTypeRepository.saveAndFlush(deviceType);

    DeviceSystemContext ctx =
        DeviceSystemContext.builder()
            .id(UUID.randomUUID())
            .deviceType(deviceType)
            .systemType(SystemType.OS)
            .r1Minutes(new BigDecimal("10"))
            .r2Minutes(new BigDecimal("5"))
            .createdAt(OffsetDateTime.now())
            .updatedAt(OffsetDateTime.now())
            .build();
    deviceSystemContextRepository.saveAndFlush(ctx);

    UUID deviceTypeId = deviceType.getId();
    UUID oid = object.getId();

    equipmentService.upsertDevice(
        oid, new ObjectDeviceUpsertRequest(deviceTypeId, new BigDecimal("2")));
    equipmentService.addAssignment(
        oid, new AssignmentCreateRequest(deviceTypeId, SystemType.OS, new BigDecimal("1")));
  }

  @Test
  void getSvod_returns200WithRows() {
    given()
        .header("Authorization", bearerToken)
        .when()
        .get("/svod")
        .then()
        .statusCode(200)
        .body("data.content", hasSize(greaterThanOrEqualTo(1)))
        .body("data.content[0].objectId", notNullValue())
        .body("data.content[0].objectName", notNullValue())
        .body("data.content[0].itogoChisloWithTravel", notNullValue());
  }

  @Test
  void getSvod_filtersByDivision_returnsOnlyObjectsInThatDivision() {
    // Create a second division with its own object (no summary yet)
    Division otherDiv =
        Division.builder()
            .id(UUID.randomUUID())
            .name("SvodIT-OtherDiv-" + UUID.randomUUID().toString().substring(0, 8))
            .createdAt(OffsetDateTime.now())
            .updatedAt(OffsetDateTime.now())
            .build();
    divisionRepository.saveAndFlush(otherDiv);

    // Filter by our original division — should contain exactly our 1 object
    given()
        .header("Authorization", bearerToken)
        .queryParam("division_id", divisionId)
        .when()
        .get("/svod")
        .then()
        .statusCode(200)
        .body("data.content", hasSize(1))
        .body("data.content[0].objectId", equalTo(objectId))
        .body("data.content[0].divisionName", notNullValue());
  }

  @Test
  void getObjectSummary_returns200WithCorrectObjectId() {
    given()
        .header("Authorization", bearerToken)
        .when()
        .get("/objects/{id}/summary", objectId)
        .then()
        .statusCode(200)
        .body("data.objectId", equalTo(objectId))
        .body("data.itogoChisloWithTravel", notNullValue())
        .body("data.computedAt", notNullValue());
  }

  @Test
  void getObjectSummary_nonexistentId_returns404() {
    given()
        .header("Authorization", bearerToken)
        .when()
        .get("/objects/{id}/summary", UUID.randomUUID())
        .then()
        .statusCode(404);
  }

  @Test
  void getSvod_responseTimeUnder3000ms_pac05() {
    long start = System.currentTimeMillis();
    given()
        .header("Authorization", bearerToken)
        .queryParam("page", 0)
        .queryParam("size", 100)
        .when()
        .get("/svod")
        .then()
        .statusCode(200);
    long elapsed = System.currentTimeMillis() - start;
    org.assertj.core.api.Assertions.assertThat(elapsed)
        .as("PAC-05: GET /svod must respond within 3000ms, took %dms", elapsed)
        .isLessThan(3000);
  }
}
