package com.workload.controller;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.greaterThanOrEqualTo;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.notNullValue;

import com.workload.support.IntegrationTestBase;
import io.restassured.http.ContentType;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class RepairControllerIT extends IntegrationTestBase {

  private String bearerToken;
  private String objectId;
  private String repairTypeId;

  @BeforeEach
  void setUp() {
    bearerToken = authenticationTestHelper.loginAsAdmin();
    objectId = createTestObject(bearerToken);

    repairTypeId =
        given()
            .header("Authorization", bearerToken)
            .when()
            .get("/catalog/repair-types")
            .then()
            .statusCode(200)
            .body("data", hasSize(greaterThanOrEqualTo(1)))
            .extract()
            .path("data[0].id");
  }

  @Test
  void getRepairsReturnsEmptyInitially() {
    given()
        .header("Authorization", bearerToken)
        .when()
        .get("/objects/{oid}/repairs", objectId)
        .then()
        .statusCode(200)
        .body("data", hasSize(0));
  }

  @Test
  void updateRepairPerformsUpsert() {
    given()
        .header("Authorization", bearerToken)
        .contentType(ContentType.JSON)
        .body(
            """
            {"count": 3}
            """)
        .when()
        .put("/objects/{oid}/repairs/{rtid}", objectId, repairTypeId)
        .then()
        .statusCode(200)
        .body("data.objectId", equalTo(objectId))
        .body("data.repairTypeId", equalTo(repairTypeId))
        .body("data.repairTypeName", notNullValue())
        .body("data.count", equalTo(3));
  }

  @Test
  void getRepairsReturnsRepairAfterUpsert() {
    given()
        .header("Authorization", bearerToken)
        .contentType(ContentType.JSON)
        .body(
            """
            {"count": 2}
            """)
        .when()
        .put("/objects/{oid}/repairs/{rtid}", objectId, repairTypeId)
        .then()
        .statusCode(200);

    given()
        .header("Authorization", bearerToken)
        .when()
        .get("/objects/{oid}/repairs", objectId)
        .then()
        .statusCode(200)
        .body("data", hasSize(greaterThanOrEqualTo(1)))
        .body("data[0].count", equalTo(2));
  }

  @Test
  void updateRepairWithNonexistentObjectReturns404() {
    given()
        .header("Authorization", bearerToken)
        .contentType(ContentType.JSON)
        .body(
            """
            {"count": 1}
            """)
        .when()
        .put("/objects/{oid}/repairs/{rtid}", UUID.randomUUID(), repairTypeId)
        .then()
        .statusCode(404);
  }

  @Test
  void updateRepairWithNonexistentRepairTypeReturns404() {
    given()
        .header("Authorization", bearerToken)
        .contentType(ContentType.JSON)
        .body(
            """
            {"count": 1}
            """)
        .when()
        .put("/objects/{oid}/repairs/{rtid}", objectId, UUID.randomUUID())
        .then()
        .statusCode(404);
  }

  private String createTestObject(String token) {
    String divisionId =
        given()
            .header("Authorization", token)
            .contentType(ContentType.JSON)
            .body(
                """
                {"name": "RepDiv-%s"}
                """
                    .formatted(UUID.randomUUID().toString().substring(0, 8)))
            .when()
            .post("/divisions")
            .then()
            .statusCode(201)
            .extract()
            .path("data.id");

    String branchId =
        given()
            .header("Authorization", token)
            .contentType(ContentType.JSON)
            .body(
                """
                {"name": "RepBranch"}
                """)
            .when()
            .post("/divisions/{divId}/branches", divisionId)
            .then()
            .statusCode(201)
            .extract()
            .path("data.id");

    return given()
        .header("Authorization", token)
        .contentType(ContentType.JSON)
        .body(
            """
            {"branchId": "%s", "name": "RepObject"}
            """
                .formatted(branchId))
        .when()
        .post("/objects")
        .then()
        .statusCode(201)
        .extract()
        .path("data.id");
  }
}
