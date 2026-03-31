package com.workload.controller;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.nullValue;

import com.workload.support.IntegrationTestBase;
import io.restassured.http.ContentType;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class RecordsControllerIT extends IntegrationTestBase {

  private String bearerToken;
  private String objectId;

  @BeforeEach
  void setUp() {
    bearerToken = authenticationTestHelper.loginAsAdmin();
    objectId = createTestObject(bearerToken);
  }

  @Test
  void getRecordsReturnsDefaultZeros() {
    given()
        .header("Authorization", bearerToken)
        .when()
        .get("/objects/{oid}/records", objectId)
        .then()
        .statusCode(200)
        .body("data.objectId", equalTo(objectId))
        .body("data.accessRequests", equalTo(0))
        .body("data.monitoringRequests", equalTo(0))
        .body("data.footageRequests", equalTo(0))
        .body("data.backupControl", equalTo(0))
        .body("data.securityAdmin", equalTo(0))
        .body("error", nullValue());
  }

  @Test
  void updateRecordsStoresValues() {
    given()
        .header("Authorization", bearerToken)
        .contentType(ContentType.JSON)
        .body(
            """
            {
              "accessRequests": 5,
              "monitoringRequests": 3,
              "footageRequests": 2,
              "backupControl": 1,
              "securityAdmin": 4
            }
            """)
        .when()
        .put("/objects/{oid}/records", objectId)
        .then()
        .statusCode(200)
        .body("data.accessRequests", equalTo(5))
        .body("data.monitoringRequests", equalTo(3))
        .body("data.footageRequests", equalTo(2))
        .body("data.backupControl", equalTo(1))
        .body("data.securityAdmin", equalTo(4));
  }

  @Test
  void updateRecordsPerformsUpsert() {
    // First update creates the record
    given()
        .header("Authorization", bearerToken)
        .contentType(ContentType.JSON)
        .body(
            """
            {"accessRequests": 1, "monitoringRequests": 0, "footageRequests": 0,
             "backupControl": 0, "securityAdmin": 0}
            """)
        .when()
        .put("/objects/{oid}/records", objectId)
        .then()
        .statusCode(200);

    // Second update modifies it
    given()
        .header("Authorization", bearerToken)
        .contentType(ContentType.JSON)
        .body(
            """
            {"accessRequests": 10, "monitoringRequests": 5, "footageRequests": 3,
             "backupControl": 2, "securityAdmin": 1}
            """)
        .when()
        .put("/objects/{oid}/records", objectId)
        .then()
        .statusCode(200)
        .body("data.accessRequests", equalTo(10))
        .body("data.monitoringRequests", equalTo(5));
  }

  @Test
  void getRecordsForNonexistentObjectReturns404() {
    given()
        .header("Authorization", bearerToken)
        .when()
        .get("/objects/{oid}/records", UUID.randomUUID())
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
                {"name": "RecDiv-%s"}
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
                {"name": "RecBranch"}
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
            {"branchId": "%s", "name": "RecObject"}
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
