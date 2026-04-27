package com.workload.controller;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.notNullValue;
import static org.hamcrest.Matchers.nullValue;

import com.workload.entity.Branch;
import com.workload.entity.Division;
import com.workload.entity.ObjectEntity;
import com.workload.entity.User;
import com.workload.repository.BranchRepository;
import com.workload.repository.DivisionRepository;
import com.workload.repository.ObjectEngineerRepository;
import com.workload.repository.ObjectRepository;
import com.workload.repository.UserRepository;
import com.workload.support.IntegrationTestBase;
import io.restassured.http.ContentType;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

class ObjectEngineerControllerIT extends IntegrationTestBase {

  @Autowired private ObjectEngineerRepository objectEngineerRepository;
  @Autowired private ObjectRepository objectRepository;
  @Autowired private UserRepository userRepository;
  @Autowired private BranchRepository branchRepository;
  @Autowired private DivisionRepository divisionRepository;

  private String bearerToken;
  private UUID objectId;
  private UUID engineerId1;
  private UUID engineerId2;

  @BeforeEach
  void setup() {
    bearerToken = authenticationTestHelper.loginAsAdmin();

    // Create division, branch, object with unique names
    String testId = UUID.randomUUID().toString().substring(0, 8);

    Division division =
        Division.builder()
            .id(UUID.randomUUID())
            .name("TestDiv_" + testId)
            .createdAt(OffsetDateTime.now())
            .updatedAt(OffsetDateTime.now())
            .build();
    division = divisionRepository.save(division);

    Branch branch =
        Branch.builder()
            .id(UUID.randomUUID())
            .name("TestBranch_" + testId)
            .division(division)
            .createdAt(OffsetDateTime.now())
            .updatedAt(OffsetDateTime.now())
            .build();
    branch = branchRepository.save(branch);

    ObjectEntity object =
        ObjectEntity.builder()
            .id(UUID.randomUUID())
            .name("TestObj_" + testId)
            .branch(branch)
            .createdAt(OffsetDateTime.now())
            .updatedAt(OffsetDateTime.now())
            .build();
    object = objectRepository.save(object);
    objectId = object.getId();

    // Create 2 engineers with unique emails
    User engineer1 =
        User.builder()
            .id(UUID.randomUUID())
            .email("eng1_" + testId + "@test.com")
            .name("Test Engineer 1")
            .passwordHash("hash")
            .role(com.workload.entity.Role.ENGINEER)
            .active(true)
            .requiresActivation(false)
            .capacityFte(BigDecimal.ONE)
            .createdAt(OffsetDateTime.now())
            .updatedAt(OffsetDateTime.now())
            .build();
    engineer1 = userRepository.save(engineer1);
    engineerId1 = engineer1.getId();

    User engineer2 =
        User.builder()
            .id(UUID.randomUUID())
            .email("eng2_" + testId + "@test.com")
            .name("Test Engineer 2")
            .passwordHash("hash")
            .role(com.workload.entity.Role.ENGINEER)
            .active(true)
            .requiresActivation(false)
            .capacityFte(BigDecimal.ONE)
            .createdAt(OffsetDateTime.now())
            .updatedAt(OffsetDateTime.now())
            .build();
    engineer2 = userRepository.save(engineer2);
    engineerId2 = engineer2.getId();
  }

  // =========================================================================
  // Test: assignEngineerToObject_returns200_engineerSummaryUpdated
  // =========================================================================
  @Test
  void assignEngineerToObject_returns201() {
    given()
        .header("Authorization", bearerToken)
        .contentType(ContentType.JSON)
        .body(
            String.format(
                """
                {
                  "engineerId": "%s",
                  "objectId": "%s"
                }
                """,
                engineerId1, objectId))
        .when()
        .post("/objects/{id}/engineers", objectId)
        .then()
        .statusCode(201)
        .body("data", notNullValue())
        .body("data.engineerId", equalTo(engineerId1.toString()))
        .body("data.objectId", equalTo(objectId.toString()))
        .body("data.assignedAt", notNullValue())
        .body("data.engineer", nullValue())
        .body("error", nullValue());
  }

  // =========================================================================
  // Test: assignEngineerToObject_inactiveEngineer_returns422
  // =========================================================================
  @Test
  void assignEngineerToObject_inactiveEngineer_returns422() {
    // Deactivate engineer
    User engineer = userRepository.findById(engineerId1).orElseThrow();
    engineer.setActive(false);
    userRepository.save(engineer);

    given()
        .header("Authorization", bearerToken)
        .contentType(ContentType.JSON)
        .body(
            String.format(
                """
                { "engineerId": "%s" }
                """,
                engineerId1))
        .when()
        .post("/objects/{id}/engineers", objectId)
        .then()
        .statusCode(422)
        .body("error.code", equalTo("ENGINEER_INACTIVE"));
  }

  // =========================================================================
  // Test: assignEngineerToObject_duplicate_returns409
  // =========================================================================
  @Test
  void assignEngineerToObject_duplicate_returns409() {
    // First assignment succeeds
    given()
        .header("Authorization", bearerToken)
        .contentType(ContentType.JSON)
        .body(
            String.format(
                """
                { "engineerId": "%s" }
                """,
                engineerId1))
        .when()
        .post("/objects/{id}/engineers", objectId)
        .then()
        .statusCode(201);

    // Duplicate assignment fails
    given()
        .header("Authorization", bearerToken)
        .contentType(ContentType.JSON)
        .body(
            String.format(
                """
                { "engineerId": "%s" }
                """,
                engineerId1))
        .when()
        .post("/objects/{id}/engineers", objectId)
        .then()
        .statusCode(409)
        .body("error.code", equalTo("ENGINEER_ALREADY_ASSIGNED"));
  }

  // =========================================================================
  // Test: removeEngineerFromObject_returns204
  // =========================================================================
  @Test
  void removeEngineerFromObject_returns204() {
    // First assign
    given()
        .header("Authorization", bearerToken)
        .contentType(ContentType.JSON)
        .body(
            String.format(
                """
                { "engineerId": "%s" }
                """,
                engineerId1))
        .when()
        .post("/objects/{id}/engineers", objectId)
        .then()
        .statusCode(201);

    // Then remove
    given()
        .header("Authorization", bearerToken)
        .when()
        .delete("/objects/{id}/engineers/{eid}", objectId, engineerId1)
        .then()
        .statusCode(204);
  }

  // =========================================================================
  // Test: removeEngineerFromObject_assignmentNotFound_returns404
  // =========================================================================
  @Test
  void removeEngineerFromObject_assignmentNotFound_returns404() {
    // Attempt to remove engineer without prior assignment
    given()
        .header("Authorization", bearerToken)
        .when()
        .delete("/objects/{id}/engineers/{eid}", objectId, engineerId1)
        .then()
        .statusCode(404)
        .body("error.code", equalTo("ASSIGNMENT_NOT_FOUND"));
  }

  // =========================================================================
  // Test: getObjectEngineers_returnsPerEngineerShares
  // =========================================================================
  @Test
  void getObjectEngineers_returnsPerEngineerShares() {
    // Assign both engineers
    given()
        .header("Authorization", bearerToken)
        .contentType(ContentType.JSON)
        .body(
            String.format(
                """
                { "engineerId": "%s" }
                """,
                engineerId1))
        .when()
        .post("/objects/{id}/engineers", objectId)
        .then()
        .statusCode(201);

    given()
        .header("Authorization", bearerToken)
        .contentType(ContentType.JSON)
        .body(
            String.format(
                """
                { "engineerId": "%s" }
                """,
                engineerId2))
        .when()
        .post("/objects/{id}/engineers", objectId)
        .then()
        .statusCode(201);

    // Get engineers list
    given()
        .header("Authorization", bearerToken)
        .when()
        .get("/objects/{id}/engineers", objectId)
        .then()
        .statusCode(200)
        .body("data", hasSize(2))
        .body("data[0].engineerId", notNullValue())
        .body("data[0].objectShare", notNullValue())
        .body("error", nullValue());
  }

  // =========================================================================
  // Test: getEngineerObjects_returnsPerObjectShares
  // =========================================================================
  @Test
  void getEngineerObjects_returnsPerObjectShares() {
    // Assign engineer to object
    given()
        .header("Authorization", bearerToken)
        .contentType(ContentType.JSON)
        .body(
            String.format(
                """
                { "engineerId": "%s" }
                """,
                engineerId1))
        .when()
        .post("/objects/{id}/engineers", objectId)
        .then()
        .statusCode(201);

    // Get objects for engineer
    given()
        .header("Authorization", bearerToken)
        .when()
        .get("/engineers/{id}/objects", engineerId1)
        .then()
        .statusCode(200)
        .body("data", hasSize(1))
        .body("data[0].objectId", notNullValue())
        .body("data[0].engineerShare", notNullValue())
        .body("error", nullValue());
  }

  // =========================================================================
  // Test: getEngineerSummary_returns200
  // =========================================================================
  @Test
  void getEngineerSummary_returns200() {
    // Assign engineer to object (triggers summary creation via recalculation)
    given()
        .header("Authorization", bearerToken)
        .contentType(ContentType.JSON)
        .body(
            String.format(
                """
                { "engineerId": "%s" }
                """,
                engineerId1))
        .when()
        .post("/objects/{id}/engineers", objectId)
        .then()
        .statusCode(201);

    // Get summary
    given()
        .header("Authorization", bearerToken)
        .when()
        .get("/engineers/{id}/summary", engineerId1)
        .then()
        .statusCode(200)
        .body("data.engineerId", notNullValue())
        .body("data.totalLoad", notNullValue())
        .body("data.status", notNullValue())
        .body("error", nullValue());
  }

  // =========================================================================
  // Test: getEngineerSummary_notFound_returns404
  // =========================================================================
  @Test
  void getEngineerSummary_notFound_returns404() {
    // Get summary for engineer with no assignments
    given()
        .header("Authorization", bearerToken)
        .when()
        .get("/engineers/{id}/summary", engineerId1)
        .then()
        .statusCode(404)
        .body("error.code", equalTo("SUMMARY_NOT_FOUND"));
  }

  // =========================================================================
  // Test: mirrorEndpoints_bothSidesConsistent
  // =========================================================================
  @Test
  void mirrorEndpoints_bothSidesConsistent() {
    // Assign via object endpoint
    given()
        .header("Authorization", bearerToken)
        .contentType(ContentType.JSON)
        .body(
            String.format(
                """
                { "engineerId": "%s" }
                """,
                engineerId1))
        .when()
        .post("/objects/{id}/engineers", objectId)
        .then()
        .statusCode(201);

    // Verify via engineer endpoint
    given()
        .header("Authorization", bearerToken)
        .when()
        .get("/engineers/{id}/objects", engineerId1)
        .then()
        .statusCode(200)
        .body("data", hasSize(1))
        .body("data[0].objectId", equalTo(objectId.toString()));

    // Verify via object endpoint
    given()
        .header("Authorization", bearerToken)
        .when()
        .get("/objects/{id}/engineers", objectId)
        .then()
        .statusCode(200)
        .body("data", hasSize(1))
        .body("data[0].engineerId", equalTo(engineerId1.toString()));
  }

  // =========================================================================
  // Test: assignEngineerToObject_minimalBody_engineerIdOnly_returns201
  // =========================================================================
  @Test
  void assignEngineerToObject_minimalBody_engineerIdOnly_returns201() {
    given()
        .header("Authorization", bearerToken)
        .contentType(ContentType.JSON)
        .body(
            String.format(
                """
                { "engineerId": "%s" }
                """,
                engineerId1))
        .when()
        .post("/objects/{id}/engineers", objectId)
        .then()
        .statusCode(201)
        .body("data.engineerId", equalTo(engineerId1.toString()))
        .body("error", nullValue());
  }

  // =========================================================================
  // Test: assignObjectToEngineer_minimalBody_objectIdOnly_returns201
  // =========================================================================
  @Test
  void assignObjectToEngineer_minimalBody_objectIdOnly_returns201() {
    given()
        .header("Authorization", bearerToken)
        .contentType(ContentType.JSON)
        .body(
            String.format(
                """
                { "objectId": "%s" }
                """,
                objectId))
        .when()
        .post("/engineers/{id}/objects", engineerId1)
        .then()
        .statusCode(201)
        .body("data.engineerId", equalTo(engineerId1.toString()))
        .body("error", nullValue());
  }
}
