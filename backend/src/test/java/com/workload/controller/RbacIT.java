package com.workload.controller;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.equalTo;

import com.workload.entity.Role;
import com.workload.support.IntegrationTestBase;
import io.restassured.http.ContentType;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

/**
 * MVP M-02 — role enforcement (TOR §12), reversing PoC simplification S-04 where any authenticated
 * user could write anything.
 */
class RbacIT extends IntegrationTestBase {

  private static final String FORBIDDEN = "You don't have permission to access this resource";

  // Request bodies here must be *valid*. Bean validation runs while resolving handler arguments,
  // which happens before the method-security interceptor, so an invalid payload returns 422 and
  // never reaches the authorisation check the test is trying to exercise.

  private String admin;
  private String viewer;
  private String engineer;
  private UUID divisionA;
  private UUID divisionB;
  private UUID objectInA;

  @BeforeEach
  void setUpFixtures() {
    admin = authenticationTestHelper.loginAsAdmin();
    viewer = authenticationTestHelper.loginAs(Role.VIEWER);
    engineer = authenticationTestHelper.loginAs(Role.ENGINEER);

    divisionA = createDivision("RBAC Division A " + UUID.randomUUID());
    divisionB = createDivision("RBAC Division B " + UUID.randomUUID());
    objectInA = createObject(divisionA, "RBAC Object A " + UUID.randomUUID());
  }

  private UUID createDivision(String name) {
    return UUID.fromString(
        given()
            .header("Authorization", admin)
            .contentType(ContentType.JSON)
            .body("{\"name\": \"" + name + "\"}")
            .when()
            .post("/divisions")
            .then()
            .statusCode(201)
            .extract()
            .path("data.id"));
  }

  private UUID createObject(UUID divisionId, String name) {
    UUID branchId =
        UUID.fromString(
            given()
                .header("Authorization", admin)
                .contentType(ContentType.JSON)
                .body("{\"name\": \"Branch " + UUID.randomUUID() + "\"}")
                .when()
                .post("/divisions/" + divisionId + "/branches")
                .then()
                .statusCode(201)
                .extract()
                .path("data.id"));

    return UUID.fromString(
        given()
            .header("Authorization", admin)
            .contentType(ContentType.JSON)
            .body("{\"branchId\": \"" + branchId + "\", \"name\": \"" + name + "\"}")
            .when()
            .post("/objects")
            .then()
            .statusCode(201)
            .extract()
            .path("data.id"));
  }

  // --- Reads are open to every authenticated role ---

  @Test
  void viewerCanRead() {
    given().header("Authorization", viewer).when().get("/divisions").then().statusCode(200);
    given().header("Authorization", viewer).when().get("/objects").then().statusCode(200);
  }

  // --- Admin-only: divisions, branches, engineers, catalog ---

  @Test
  void viewerCannotCreateDivision() {
    given()
        .header("Authorization", viewer)
        .contentType(ContentType.JSON)
        .body("{\"name\": \"Nope\"}")
        .when()
        .post("/divisions")
        .then()
        .statusCode(403)
        .body("error.code", equalTo(403))
        .body("error.message", equalTo(FORBIDDEN));
  }

  @Test
  void editorCannotCreateDivision() {
    String editor = authenticationTestHelper.loginAs(Role.EDITOR, divisionA);

    given()
        .header("Authorization", editor)
        .contentType(ContentType.JSON)
        .body("{\"name\": \"Nope\"}")
        .when()
        .post("/divisions")
        .then()
        .statusCode(403);
  }

  @Test
  void editorCannotDeleteDivision() {
    String editor = authenticationTestHelper.loginAs(Role.EDITOR, divisionA);

    given()
        .header("Authorization", editor)
        .when()
        .delete("/divisions/" + divisionA)
        .then()
        .statusCode(403)
        .body("error.code", equalTo(403))
        .body("error.message", equalTo(FORBIDDEN));
  }

  @Test
  void viewerCannotDeleteBranch() {
    UUID branchId =
        UUID.fromString(
            given()
                .header("Authorization", admin)
                .contentType(ContentType.JSON)
                .body("{\"name\": \"Branch " + UUID.randomUUID() + "\"}")
                .when()
                .post("/divisions/" + divisionB + "/branches")
                .then()
                .statusCode(201)
                .extract()
                .path("data.id"));

    given()
        .header("Authorization", viewer)
        .when()
        .delete("/branches/" + branchId)
        .then()
        .statusCode(403);
  }

  @Test
  void viewerCannotCreateEngineer() {
    given()
        .header("Authorization", viewer)
        .contentType(ContentType.JSON)
        .body(
            "{\"email\": \"rbac-x@workload.local\", \"name\": \"X\","
                + " \"password\": \"password123\", \"capacityFte\": 1.0}")
        .when()
        .post("/engineers")
        .then()
        .statusCode(403);
  }

  @Test
  void editorCannotCreateDeviceType() {
    String editor = authenticationTestHelper.loginAs(Role.EDITOR, divisionA);

    given()
        .header("Authorization", editor)
        .contentType(ContentType.JSON)
        .body("{\"name\": \"RBAC Device\"}")
        .when()
        .post("/catalog/devices")
        .then()
        .statusCode(403);
  }

  // --- AC-08: editor writes are scoped to their own division ---

  @Test
  void editorCanWriteObjectInOwnDivision() {
    String editorA = authenticationTestHelper.loginAs(Role.EDITOR, divisionA);

    given()
        .header("Authorization", editorA)
        .contentType(ContentType.JSON)
        .body("{\"name\": \"Renamed by editor\"}")
        .when()
        .put("/objects/" + objectInA)
        .then()
        .statusCode(200);
  }

  @Test
  void editorCannotWriteObjectInOtherDivision() {
    String editorB = authenticationTestHelper.loginAs(Role.EDITOR, divisionB);

    given()
        .header("Authorization", editorB)
        .contentType(ContentType.JSON)
        .body("{\"name\": \"Should not happen\"}")
        .when()
        .put("/objects/" + objectInA)
        .then()
        .statusCode(403)
        .body("error.code", equalTo(403));
  }

  @Test
  void editorCannotDeleteObjectInOtherDivision() {
    String editorB = authenticationTestHelper.loginAs(Role.EDITOR, divisionB);

    given()
        .header("Authorization", editorB)
        .when()
        .delete("/objects/" + objectInA)
        .then()
        .statusCode(403);
  }

  @Test
  void viewerCannotWriteObject() {
    given()
        .header("Authorization", viewer)
        .contentType(ContentType.JSON)
        .body("{\"name\": \"Nope\"}")
        .when()
        .put("/objects/" + objectInA)
        .then()
        .statusCode(403);
  }

  @Test
  void engineerCannotWriteObject() {
    given()
        .header("Authorization", engineer)
        .contentType(ContentType.JSON)
        .body("{\"name\": \"Nope\"}")
        .when()
        .put("/objects/" + objectInA)
        .then()
        .statusCode(403);
  }

  // --- Travel and equipment: admin or editor-in-division only, never engineer ---

  @Test
  void engineerCannotWriteTravel() {
    given()
        .header("Authorization", engineer)
        .contentType(ContentType.JSON)
        .body("{\"distanceKm\": 5.0, \"oneWayTimeMin\": 10.0}")
        .when()
        .put("/objects/" + objectInA + "/travel")
        .then()
        .statusCode(403);
  }

  @Test
  void viewerCannotWriteRecords() {
    given()
        .header("Authorization", viewer)
        .contentType(ContentType.JSON)
        .body("{\"accessRequests\": 1}")
        .when()
        .put("/objects/" + objectInA + "/records")
        .then()
        .statusCode(403);
  }

  @Test
  void editorCannotCreateObjectInOtherDivision() {
    String editorB = authenticationTestHelper.loginAs(Role.EDITOR, divisionB);
    UUID branchInA =
        UUID.fromString(
            given()
                .header("Authorization", admin)
                .contentType(ContentType.JSON)
                .body("{\"name\": \"Branch " + UUID.randomUUID() + "\"}")
                .when()
                .post("/divisions/" + divisionA + "/branches")
                .then()
                .statusCode(201)
                .extract()
                .path("data.id"));

    given()
        .header("Authorization", editorB)
        .contentType(ContentType.JSON)
        .body("{\"branchId\": \"" + branchInA + "\", \"name\": \"Sneaky\"}")
        .when()
        .post("/objects")
        .then()
        .statusCode(403);
  }

  // --- Engineer visibility (TOR §12): API-level filtering, not a denial ---

  @Test
  void engineerSeesOnlyOwnRowInEngineerList() {
    String engineerToken = authenticationTestHelper.loginAs(Role.ENGINEER);
    String ownEmail = emailOf(engineerToken);
    // A second engineer that must not appear in the first one's list.
    authenticationTestHelper.loginAs(Role.ENGINEER);

    given()
        .header("Authorization", engineerToken)
        .when()
        .get("/engineers")
        .then()
        .statusCode(200)
        .body("data.size()", equalTo(1))
        .body("data[0].email", equalTo(ownEmail));
  }

  @Test
  void adminSeesAllEngineers() {
    authenticationTestHelper.loginAs(Role.ENGINEER);

    given()
        .header("Authorization", admin)
        .when()
        .get("/engineers")
        .then()
        .statusCode(200)
        .body("data.size()", org.hamcrest.Matchers.greaterThan(1));
  }

  @Test
  void viewerSeesAllEngineers() {
    authenticationTestHelper.loginAs(Role.ENGINEER);

    given()
        .header("Authorization", viewer)
        .when()
        .get("/engineers")
        .then()
        .statusCode(200)
        .body("data.size()", org.hamcrest.Matchers.greaterThan(1));
  }

  /** Filtering the list would be pointless if the detail route stayed open. */
  @Test
  void engineerCannotReadAnotherEngineerRow() {
    String otherToken = authenticationTestHelper.loginAs(Role.ENGINEER);
    String otherId =
        given()
            .header("Authorization", otherToken)
            .when()
            .get("/engineers")
            .then()
            .statusCode(200)
            .extract()
            .path("data[0].id");

    given()
        .header("Authorization", engineer)
        .when()
        .get("/engineers/" + otherId)
        .then()
        .statusCode(403);
  }

  @Test
  void engineerCanReadOwnRow() {
    String ownId =
        given()
            .header("Authorization", engineer)
            .when()
            .get("/engineers")
            .then()
            .statusCode(200)
            .extract()
            .path("data[0].id");

    given()
        .header("Authorization", engineer)
        .when()
        .get("/engineers/" + ownId)
        .then()
        .statusCode(200);
  }

  private String emailOf(String bearerToken) {
    return given()
        .header("Authorization", bearerToken)
        .when()
        .get("/auth/me")
        .then()
        .statusCode(200)
        .extract()
        .path("data.email");
  }

  /**
   * A method-security denial must carry the standard envelope. Note this exercises {@code
   * GlobalExceptionHandler.handleAccessDenied}, not the {@code accessDeniedHandler} bean: the
   * filter chain declares only {@code permitAll} and {@code authenticated}, so no URL rule can
   * currently deny an authenticated request. The bean is retained for when one does, and carries
   * the same message deliberately.
   */
  @Test
  void forbiddenResponsesUseTheStandardEnvelope() {
    given()
        .header("Authorization", viewer)
        .contentType(ContentType.JSON)
        .body("{\"name\": \"Nope\"}")
        .when()
        .post("/divisions")
        .then()
        .statusCode(403)
        .body("data", org.hamcrest.Matchers.nullValue())
        .body("error.code", equalTo(403))
        .body("error.message", equalTo(FORBIDDEN));
  }
}
