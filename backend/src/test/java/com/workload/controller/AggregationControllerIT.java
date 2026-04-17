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
import com.workload.repository.SummaryRepository;
import com.workload.service.EquipmentService;
import com.workload.support.IntegrationTestBase;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;
import org.assertj.core.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

class AggregationControllerIT extends IntegrationTestBase {

  @Autowired private DivisionRepository divisionRepository;
  @Autowired private BranchRepository branchRepository;
  @Autowired private ObjectRepository objectRepository;
  @Autowired private DeviceTypeRepository deviceTypeRepository;
  @Autowired private DeviceSystemContextRepository deviceSystemContextRepository;
  @Autowired private SummaryRepository summaryRepository;
  @Autowired private EquipmentService equipmentService;

  private String bearerToken;
  private String divisionId1;
  private String divisionId2;
  private String objectId1;
  private String objectId2;
  private String objectId3;

  @BeforeEach
  void setUp() {
    bearerToken = authenticationTestHelper.loginAsAdmin();

    // Create shared device type + context for triggering recalculation
    DeviceType deviceType =
        DeviceType.builder()
            .id(UUID.randomUUID())
            .name("AggIT-Device-" + UUID.randomUUID().toString().substring(0, 8))
            .description("Test device for aggregation IT")
            .createdAt(OffsetDateTime.now())
            .updatedAt(OffsetDateTime.now())
            .build();
    deviceTypeRepository.saveAndFlush(deviceType);

    DeviceSystemContext ctx =
        DeviceSystemContext.builder()
            .id(UUID.randomUUID())
            .deviceType(deviceType)
            .systemType(SystemType.OS)
            .r1Minutes(new BigDecimal("20"))
            .r2Minutes(new BigDecimal("10"))
            .createdAt(OffsetDateTime.now())
            .updatedAt(OffsetDateTime.now())
            .build();
    deviceSystemContextRepository.saveAndFlush(ctx);

    // Division 1 with 2 objects
    Division division1 =
        Division.builder()
            .id(UUID.randomUUID())
            .name("AggIT-Div1-" + UUID.randomUUID().toString().substring(0, 8))
            .createdAt(OffsetDateTime.now())
            .updatedAt(OffsetDateTime.now())
            .build();
    divisionRepository.saveAndFlush(division1);
    divisionId1 = division1.getId().toString();

    Branch branch1 =
        Branch.builder()
            .id(UUID.randomUUID())
            .division(division1)
            .name("AggIT-Branch1")
            .createdAt(OffsetDateTime.now())
            .updatedAt(OffsetDateTime.now())
            .build();
    branchRepository.saveAndFlush(branch1);

    ObjectEntity object1 =
        ObjectEntity.builder()
            .id(UUID.randomUUID())
            .branch(branch1)
            .name("AggIT-Object1")
            .createdAt(OffsetDateTime.now())
            .updatedAt(OffsetDateTime.now())
            .build();
    objectRepository.saveAndFlush(object1);
    objectId1 = object1.getId().toString();

    ObjectEntity object2 =
        ObjectEntity.builder()
            .id(UUID.randomUUID())
            .branch(branch1)
            .name("AggIT-Object2")
            .createdAt(OffsetDateTime.now())
            .updatedAt(OffsetDateTime.now())
            .build();
    objectRepository.saveAndFlush(object2);
    objectId2 = object2.getId().toString();

    // Division 2 with 1 object
    Division division2 =
        Division.builder()
            .id(UUID.randomUUID())
            .name("AggIT-Div2-" + UUID.randomUUID().toString().substring(0, 8))
            .createdAt(OffsetDateTime.now())
            .updatedAt(OffsetDateTime.now())
            .build();
    divisionRepository.saveAndFlush(division2);
    divisionId2 = division2.getId().toString();

    Branch branch2 =
        Branch.builder()
            .id(UUID.randomUUID())
            .division(division2)
            .name("AggIT-Branch2")
            .createdAt(OffsetDateTime.now())
            .updatedAt(OffsetDateTime.now())
            .build();
    branchRepository.saveAndFlush(branch2);

    ObjectEntity object3 =
        ObjectEntity.builder()
            .id(UUID.randomUUID())
            .branch(branch2)
            .name("AggIT-Object3")
            .createdAt(OffsetDateTime.now())
            .updatedAt(OffsetDateTime.now())
            .build();
    objectRepository.saveAndFlush(object3);
    objectId3 = object3.getId().toString();

    // Trigger recalculation for all 3 objects
    UUID dtId = deviceType.getId();
    for (UUID oid : List.of(object1.getId(), object2.getId(), object3.getId())) {
      equipmentService.upsertDevice(oid, new ObjectDeviceUpsertRequest(dtId, new BigDecimal("1")));
      equipmentService.addAssignment(
          oid, new AssignmentCreateRequest(dtId, SystemType.OS, new BigDecimal("1")));
    }
  }

  @Test
  void getCompany_returns200() {
    given()
        .header("Authorization", bearerToken)
        .when()
        .get("/aggregations/company")
        .then()
        .statusCode(200)
        .body("data.requiredFte", notNullValue())
        .body("data.staffingNeed", notNullValue())
        .body("data.objectCount", greaterThanOrEqualTo(3))
        .body("data.divisionCount", greaterThanOrEqualTo(2))
        .body("data.breakdown", notNullValue());
  }

  @Test
  void getDivisions_returns200() {
    given()
        .header("Authorization", bearerToken)
        .when()
        .get("/aggregations/divisions")
        .then()
        .statusCode(200)
        .body("data", hasSize(greaterThanOrEqualTo(2)))
        .body("data[0].divisionId", notNullValue())
        .body("data[0].requiredFte", notNullValue());
  }

  @Test
  void getDivision_byId_returns200() {
    given()
        .header("Authorization", bearerToken)
        .when()
        .get("/aggregations/divisions/{id}", divisionId1)
        .then()
        .statusCode(200)
        .body("data.divisionId", equalTo(divisionId1))
        .body("data.objectCount", equalTo(2))
        .body("data.requiredFte", notNullValue());
  }

  @Test
  void getDivision_nonexistent_returns404() {
    given()
        .header("Authorization", bearerToken)
        .when()
        .get("/aggregations/divisions/{id}", UUID.randomUUID())
        .then()
        .statusCode(404);
  }

  @Test
  void getBranches_returns200() {
    given()
        .header("Authorization", bearerToken)
        .when()
        .get("/aggregations/branches")
        .then()
        .statusCode(200)
        .body("data", hasSize(greaterThanOrEqualTo(2)))
        .body("data[0].branchId", notNullValue())
        .body("data[0].requiredFte", notNullValue());
  }

  @Test
  void getCoverageGaps_returnsAllObjects() {
    given()
        .header("Authorization", bearerToken)
        .when()
        .get("/coverage/gaps")
        .then()
        .statusCode(200)
        .body("data", hasSize(greaterThanOrEqualTo(3)))
        .body("data[0].objectId", notNullValue())
        .body("data[0].objectName", notNullValue());
  }

  @Test
  void getCoverageGaps_filtersByDivision() {
    given()
        .header("Authorization", bearerToken)
        .queryParam("division_id", divisionId1)
        .when()
        .get("/coverage/gaps")
        .then()
        .statusCode(200)
        .body("data", hasSize(2));
  }

  /**
   * PAC-08: division.requiredFte must equal SUM(individual object summaries' itogoChisloWithTravel)
   * within 0.000001 tolerance.
   */
  @Test
  void pac08_divisionFte_equalsSumOfObjectFtes() {
    // Fetch division aggregation
    BigDecimal divisionFte =
        new BigDecimal(
            given()
                .header("Authorization", bearerToken)
                .when()
                .get("/aggregations/divisions/{id}", divisionId1)
                .then()
                .statusCode(200)
                .extract()
                .path("data.requiredFte")
                .toString());

    // Fetch individual summaries for object1 and object2
    BigDecimal fte1 =
        new BigDecimal(
            given()
                .header("Authorization", bearerToken)
                .when()
                .get("/objects/{id}/summary", objectId1)
                .then()
                .statusCode(200)
                .extract()
                .path("data.itogoChisloWithTravel")
                .toString());

    BigDecimal fte2 =
        new BigDecimal(
            given()
                .header("Authorization", bearerToken)
                .when()
                .get("/objects/{id}/summary", objectId2)
                .then()
                .statusCode(200)
                .extract()
                .path("data.itogoChisloWithTravel")
                .toString());

    BigDecimal expectedSum = fte1.add(fte2);
    BigDecimal tolerance = new BigDecimal("0.000001");
    Assertions.assertThat(divisionFte.subtract(expectedSum).abs().compareTo(tolerance))
        .as(
            "PAC-08: divisionFte=%s should equal sum(%s + %s)=%s within %s",
            divisionFte, fte1, fte2, expectedSum, tolerance)
        .isLessThanOrEqualTo(0);
  }
}
