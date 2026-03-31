package com.workload.controller;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.equalTo;

import com.workload.support.IntegrationTestBase;
import io.restassured.http.ContentType;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class TravelControllerIT extends IntegrationTestBase {

  private String bearerToken;
  private String objectId;

  @BeforeEach
  void setUp() {
    bearerToken = authenticationTestHelper.loginAsAdmin();
    objectId = createTestObject(bearerToken);
  }

  @Test
  void getTravelReturnsDefault() {
    given()
        .header("Authorization", bearerToken)
        .when()
        .get("/objects/{oid}/travel", objectId)
        .then()
        .statusCode(200)
        .body("data.objectId", equalTo(objectId));
  }

  @Test
  void updateTravelStoresData() {
    given()
        .header("Authorization", bearerToken)
        .contentType(ContentType.JSON)
        .body(
            """
            {"transportType": "car", "distanceKm": 15.5, "oneWayTimeMin": 30.0}
            """)
        .when()
        .put("/objects/{oid}/travel", objectId)
        .then()
        .statusCode(200)
        .body("data.roundTripMin", equalTo(60.0f));
  }

  @Test
  void updateTravelWithRoundTripMinRejects422() {
    given()
        .header("Authorization", bearerToken)
        .contentType(ContentType.JSON)
        .body(
            """
{"transportType": "car", "distanceKm": 15.5, "oneWayTimeMin": 30.0, "roundTripMin": 60.0}
""")
        .when()
        .put("/objects/{oid}/travel", objectId)
        .then()
        .statusCode(422)
        .body("error.code", equalTo("ROUND_TRIP_NOT_EDITABLE"));
  }

  @Test
  void updateTravelWithSnakeCaseRoundTripMinRejects422() {
    given()
        .header("Authorization", bearerToken)
        .contentType(ContentType.JSON)
        .body(
            """
{"transportType": "car", "distanceKm": 15.5, "oneWayTimeMin": 30.0, "round_trip_min": 60.0}
""")
        .when()
        .put("/objects/{oid}/travel", objectId)
        .then()
        .statusCode(422)
        .body("error.code", equalTo("ROUND_TRIP_NOT_EDITABLE"));
  }

  @Test
  void updateTravelWithoutTransportType() {
    given()
        .header("Authorization", bearerToken)
        .contentType(ContentType.JSON)
        .body(
            """
            {"distanceKm": 10.0, "oneWayTimeMin": 20.0}
            """)
        .when()
        .put("/objects/{oid}/travel", objectId)
        .then()
        .statusCode(200)
        .body("data.roundTripMin", equalTo(40.0f));
  }

  private String createTestObject(String token) {
    String divisionId =
        given()
            .header("Authorization", token)
            .contentType(ContentType.JSON)
            .body(
                """
                {"name": "TravelDiv-%s"}
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
                {"name": "TravelBranch"}
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
            {"branchId": "%s", "name": "TravelObj"}
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
