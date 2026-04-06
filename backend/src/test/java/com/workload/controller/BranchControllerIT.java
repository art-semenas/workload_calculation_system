package com.workload.controller;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.notNullValue;

import com.workload.support.IntegrationTestBase;
import io.restassured.http.ContentType;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class BranchControllerIT extends IntegrationTestBase {

  private String bearerToken;
  private String divisionId;
  private String branchId;

  @BeforeEach
  void setUp() {
    bearerToken = authenticationTestHelper.loginAsAdmin();

    divisionId =
        given()
            .header("Authorization", bearerToken)
            .contentType(ContentType.JSON)
            .body(
                """
                {"name": "BrDiv-%s"}
                """
                    .formatted(UUID.randomUUID().toString().substring(0, 8)))
            .when()
            .post("/divisions")
            .then()
            .statusCode(201)
            .extract()
            .path("data.id");

    branchId =
        given()
            .header("Authorization", bearerToken)
            .contentType(ContentType.JSON)
            .body(
                """
                {"name": "Test Branch"}
                """)
            .when()
            .post("/divisions/{divId}/branches", divisionId)
            .then()
            .statusCode(201)
            .extract()
            .path("data.id");
  }

  @Test
  void getBranchByIdReturns200() {
    given()
        .header("Authorization", bearerToken)
        .when()
        .get("/branches/{id}", branchId)
        .then()
        .statusCode(200)
        .body("data.id", equalTo(branchId))
        .body("data.name", equalTo("Test Branch"))
        .body("data.divisionId", equalTo(divisionId))
        .body("data.objectCount", equalTo(0));
  }

  @Test
  void getBranchNotFoundReturns404() {
    given()
        .header("Authorization", bearerToken)
        .when()
        .get("/branches/{id}", UUID.randomUUID())
        .then()
        .statusCode(404)
        .body("error.code", notNullValue());
  }

  @Test
  void updateBranchReturns200() {
    given()
        .header("Authorization", bearerToken)
        .contentType(ContentType.JSON)
        .body(
            """
            {"name": "Updated Branch"}
            """)
        .when()
        .put("/branches/{id}", branchId)
        .then()
        .statusCode(200)
        .body("data.name", equalTo("Updated Branch"));
  }

  @Test
  void updateBranchNotFoundReturns404() {
    given()
        .header("Authorization", bearerToken)
        .contentType(ContentType.JSON)
        .body(
            """
            {"name": "New Name"}
            """)
        .when()
        .put("/branches/{id}", UUID.randomUUID())
        .then()
        .statusCode(404);
  }
}
