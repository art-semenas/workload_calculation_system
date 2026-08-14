package com.workload.controller;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.greaterThanOrEqualTo;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.notNullValue;
import static org.hamcrest.Matchers.nullValue;

import com.workload.support.IntegrationTestBase;
import io.restassured.http.ContentType;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class DivisionControllerIT extends IntegrationTestBase {

  private String bearerToken;

  @BeforeEach
  void authenticate() {
    bearerToken = authenticationTestHelper.loginAsAdmin();
  }

  @Test
  void getDivisionsReturnsList() {
    // Create at least one division to verify endpoint works
    given()
        .header("Authorization", bearerToken)
        .contentType(ContentType.JSON)
        .body(
            """
            {"name": "TestDiv"}
            """)
        .when()
        .post("/divisions")
        .then()
        .statusCode(201);

    given()
        .header("Authorization", bearerToken)
        .when()
        .get("/divisions")
        .then()
        .statusCode(200)
        .body("data", hasSize(greaterThanOrEqualTo(1)))
        .body("error", nullValue());
  }

  @Test
  void createDivisionReturns201() {
    given()
        .header("Authorization", bearerToken)
        .contentType(ContentType.JSON)
        .body(
            """
            {"name": "Brest"}
            """)
        .when()
        .post("/divisions")
        .then()
        .statusCode(201)
        .body("data.name", equalTo("Brest"))
        .body("data.id", notNullValue())
        .body("data.branchCount", equalTo(0))
        .body("data.objectCount", equalTo(0));
  }

  @Test
  void getDivisionByIdReturns200() {
    String id =
        given()
            .header("Authorization", bearerToken)
            .contentType(ContentType.JSON)
            .body(
                """
                {"name": "Minsk"}
                """)
            .when()
            .post("/divisions")
            .then()
            .statusCode(201)
            .extract()
            .path("data.id");

    given()
        .header("Authorization", bearerToken)
        .when()
        .get("/divisions/{id}", id)
        .then()
        .statusCode(200)
        .body("data.name", equalTo("Minsk"));
  }

  @Test
  void getDivisionNotFoundReturns404() {
    given()
        .header("Authorization", bearerToken)
        .when()
        .get("/divisions/{id}", UUID.randomUUID())
        .then()
        .statusCode(404)
        .body("error.code", equalTo(404));
  }

  @Test
  void updateDivisionReturns200() {
    String id =
        given()
            .header("Authorization", bearerToken)
            .contentType(ContentType.JSON)
            .body(
                """
                {"name": "OldName"}
                """)
            .when()
            .post("/divisions")
            .then()
            .statusCode(201)
            .extract()
            .path("data.id");

    given()
        .header("Authorization", bearerToken)
        .contentType(ContentType.JSON)
        .body(
            """
            {"name": "NewName"}
            """)
        .when()
        .put("/divisions/{id}", id)
        .then()
        .statusCode(200)
        .body("data.name", equalTo("NewName"));
  }

  @Test
  void getBranchesForDivisionReturnsEmptyList() {
    String divId =
        given()
            .header("Authorization", bearerToken)
            .contentType(ContentType.JSON)
            .body(
                """
                {"name": "Gomel"}
                """)
            .when()
            .post("/divisions")
            .then()
            .statusCode(201)
            .extract()
            .path("data.id");

    given()
        .header("Authorization", bearerToken)
        .when()
        .get("/divisions/{id}/branches", divId)
        .then()
        .statusCode(200)
        .body("data", hasSize(0));
  }

  @Test
  void createBranchReturns201() {
    String divId =
        given()
            .header("Authorization", bearerToken)
            .contentType(ContentType.JSON)
            .body(
                """
                {"name": "Grodno"}
                """)
            .when()
            .post("/divisions")
            .then()
            .statusCode(201)
            .extract()
            .path("data.id");

    given()
        .header("Authorization", bearerToken)
        .contentType(ContentType.JSON)
        .body(
            """
            {"name": "Branch One"}
            """)
        .when()
        .post("/divisions/{id}/branches", divId)
        .then()
        .statusCode(201)
        .body("data.name", equalTo("Branch One"))
        .body("data.divisionId", equalTo(divId))
        .body("data.objectCount", equalTo(0));
  }

  @Test
  void getBranchByIdReturns200() {
    String divId =
        given()
            .header("Authorization", bearerToken)
            .contentType(ContentType.JSON)
            .body(
                """
                {"name": "Vitebsk"}
                """)
            .when()
            .post("/divisions")
            .then()
            .statusCode(201)
            .extract()
            .path("data.id");

    String branchId =
        given()
            .header("Authorization", bearerToken)
            .contentType(ContentType.JSON)
            .body(
                """
                {"name": "Branch Two"}
                """)
            .when()
            .post("/divisions/{id}/branches", divId)
            .then()
            .statusCode(201)
            .extract()
            .path("data.id");

    given()
        .header("Authorization", bearerToken)
        .when()
        .get("/branches/{id}", branchId)
        .then()
        .statusCode(200)
        .body("data.name", equalTo("Branch Two"));
  }

  @Test
  void updateBranchReturns200() {
    String divId =
        given()
            .header("Authorization", bearerToken)
            .contentType(ContentType.JSON)
            .body(
                """
                {"name": "Mogilev"}
                """)
            .when()
            .post("/divisions")
            .then()
            .statusCode(201)
            .extract()
            .path("data.id");

    String branchId =
        given()
            .header("Authorization", bearerToken)
            .contentType(ContentType.JSON)
            .body(
                """
                {"name": "OldBranch"}
                """)
            .when()
            .post("/divisions/{id}/branches", divId)
            .then()
            .statusCode(201)
            .extract()
            .path("data.id");

    given()
        .header("Authorization", bearerToken)
        .contentType(ContentType.JSON)
        .body(
            """
            {"name": "NewBranch"}
            """)
        .when()
        .put("/branches/{id}", branchId)
        .then()
        .statusCode(200)
        .body("data.name", equalTo("NewBranch"));
  }

  @Test
  void unauthenticatedRequestReturns401() {
    given().when().get("/divisions").then().statusCode(401);
  }

  // --- MVP M-02: cascade-guarded deletes ---

  @Test
  void deleteEmptyDivisionReturns204() {
    String divId = createDivision("DeletableDiv");

    given()
        .header("Authorization", bearerToken)
        .when()
        .delete("/divisions/{id}", divId)
        .then()
        .statusCode(204);

    given()
        .header("Authorization", bearerToken)
        .when()
        .get("/divisions/{id}", divId)
        .then()
        .statusCode(404);
  }

  @Test
  void deleteDivisionWithBranchesReturns409() {
    String divId = createDivision("DivWithBranch");
    createBranch(divId, "Blocking Branch");

    given()
        .header("Authorization", bearerToken)
        .when()
        .delete("/divisions/{id}", divId)
        .then()
        .statusCode(409)
        .body("error.code", equalTo(409))
        .body("error.message", equalTo("Cannot delete: division has 1 branches"));
  }

  @Test
  void deleteUnknownDivisionReturns404() {
    given()
        .header("Authorization", bearerToken)
        .when()
        .delete("/divisions/{id}", UUID.randomUUID())
        .then()
        .statusCode(404)
        .body("error.message", equalTo("Division not found"));
  }

  @Test
  void deleteEmptyBranchReturns204() {
    String divId = createDivision("DivForBranchDelete");
    String branchId = createBranch(divId, "Deletable Branch");

    given()
        .header("Authorization", bearerToken)
        .when()
        .delete("/branches/{id}", branchId)
        .then()
        .statusCode(204);

    given()
        .header("Authorization", bearerToken)
        .when()
        .get("/branches/{id}", branchId)
        .then()
        .statusCode(404);
  }

  @Test
  void deleteBranchWithObjectsReturns409() {
    String divId = createDivision("DivWithObject");
    String branchId = createBranch(divId, "Branch With Object");
    given()
        .header("Authorization", bearerToken)
        .contentType(ContentType.JSON)
        .body("{\"branchId\": \"" + branchId + "\", \"name\": \"Blocking Object\"}")
        .when()
        .post("/objects")
        .then()
        .statusCode(201);

    given()
        .header("Authorization", bearerToken)
        .when()
        .delete("/branches/{id}", branchId)
        .then()
        .statusCode(409)
        .body("error.code", equalTo(409))
        .body("error.message", equalTo("Cannot delete: branch has 1 objects"));
  }

  @Test
  void deleteUnknownBranchReturns404() {
    given()
        .header("Authorization", bearerToken)
        .when()
        .delete("/branches/{id}", UUID.randomUUID())
        .then()
        .statusCode(404)
        .body("error.message", equalTo("Branch not found"));
  }

  private String createDivision(String name) {
    return given()
        .header("Authorization", bearerToken)
        .contentType(ContentType.JSON)
        .body("{\"name\": \"" + name + " " + UUID.randomUUID() + "\"}")
        .when()
        .post("/divisions")
        .then()
        .statusCode(201)
        .extract()
        .path("data.id");
  }

  private String createBranch(String divisionId, String name) {
    return given()
        .header("Authorization", bearerToken)
        .contentType(ContentType.JSON)
        .body("{\"name\": \"" + name + " " + UUID.randomUUID() + "\"}")
        .when()
        .post("/divisions/{id}/branches", divisionId)
        .then()
        .statusCode(201)
        .extract()
        .path("data.id");
  }
}
