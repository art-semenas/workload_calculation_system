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

class CatalogControllerIT extends IntegrationTestBase {

  private String bearerToken;

  @BeforeEach
  void authenticate() {
    bearerToken = authenticationTestHelper.loginAsAdmin();
  }

  @Test
  void getDeviceTypesReturnsSeededData() {
    given()
        .header("Authorization", bearerToken)
        .when()
        .get("/catalog/devices")
        .then()
        .statusCode(200)
        .body("data", hasSize(greaterThanOrEqualTo(1)))
        .body("data[0].id", notNullValue())
        .body("data[0].name", notNullValue());
  }

  @Test
  void getDeviceTypeByIdReturns200() {
    String id =
        given()
            .header("Authorization", bearerToken)
            .when()
            .get("/catalog/devices")
            .then()
            .statusCode(200)
            .extract()
            .path("data[0].id");

    given()
        .header("Authorization", bearerToken)
        .when()
        .get("/catalog/devices/{id}", id)
        .then()
        .statusCode(200)
        .body("data.id", equalTo(id));
  }

  @Test
  void getContextsForDeviceReturnsData() {
    String id =
        given()
            .header("Authorization", bearerToken)
            .when()
            .get("/catalog/devices")
            .then()
            .statusCode(200)
            .extract()
            .path("data[0].id");

    given()
        .header("Authorization", bearerToken)
        .when()
        .get("/catalog/devices/{id}/contexts", id)
        .then()
        .statusCode(200)
        .body("data", hasSize(greaterThanOrEqualTo(1)));
  }

  @Test
  void getRepairTypesReturnsSeededData() {
    given()
        .header("Authorization", bearerToken)
        .when()
        .get("/catalog/repairs")
        .then()
        .statusCode(200)
        .body("data", hasSize(greaterThanOrEqualTo(1)))
        .body("data[0].id", notNullValue());
  }

  // ── Device type write endpoint tests ─────────────────────────────────────

  @Test
  void createDeviceTypeReturns201() {
    given()
        .header("Authorization", bearerToken)
        .contentType(ContentType.JSON)
        .body(
            "{\"name\": \"TestDevice-"
                + UUID.randomUUID().toString().substring(0, 8)
                + "\", \"description\": \"test\"}")
        .when()
        .post("/catalog/devices")
        .then()
        .statusCode(201)
        .body("data.id", notNullValue())
        .body("data.name", notNullValue());
  }

  @Test
  void updateDeviceTypeReturns200() {
    String id =
        given()
            .header("Authorization", bearerToken)
            .contentType(ContentType.JSON)
            .body("{\"name\": \"UpdateMe-" + UUID.randomUUID().toString().substring(0, 8) + "\"}")
            .when()
            .post("/catalog/devices")
            .then()
            .statusCode(201)
            .extract()
            .path("data.id");

    given()
        .header("Authorization", bearerToken)
        .contentType(ContentType.JSON)
        .body("{\"name\": \"Updated\"}")
        .when()
        .put("/catalog/devices/{id}", id)
        .then()
        .statusCode(200)
        .body("data.name", equalTo("Updated"));
  }

  @Test
  void deleteDeviceTypeReturns204WhenNotInUse() {
    String id =
        given()
            .header("Authorization", bearerToken)
            .contentType(ContentType.JSON)
            .body("{\"name\": \"DeleteMe-" + UUID.randomUUID().toString().substring(0, 8) + "\"}")
            .when()
            .post("/catalog/devices")
            .then()
            .statusCode(201)
            .extract()
            .path("data.id");

    given()
        .header("Authorization", bearerToken)
        .when()
        .delete("/catalog/devices/{id}", id)
        .then()
        .statusCode(204);
  }

  // ── Context write endpoint tests ──────────────────────────────────────────

  @Test
  void createContextReturns201() {
    String deviceTypeId =
        given()
            .header("Authorization", bearerToken)
            .contentType(ContentType.JSON)
            .body("{\"name\": \"CtxDevice-" + UUID.randomUUID().toString().substring(0, 8) + "\"}")
            .when()
            .post("/catalog/devices")
            .then()
            .statusCode(201)
            .extract()
            .path("data.id");

    given()
        .header("Authorization", bearerToken)
        .contentType(ContentType.JSON)
        .body("{\"systemType\": \"OS\", \"r1Minutes\": 5.5, \"r2Minutes\": 3.0}")
        .when()
        .post("/catalog/devices/{id}/contexts", deviceTypeId)
        .then()
        .statusCode(201)
        .body("data.id", notNullValue())
        .body("data.systemType", equalTo("OS"));
  }

  @Test
  void deleteContextReturns409WhenInUse() {
    // Get a seeded device type and its first context
    String deviceTypeId =
        given()
            .header("Authorization", bearerToken)
            .when()
            .get("/catalog/devices")
            .then()
            .statusCode(200)
            .extract()
            .path("data[0].id");

    String contextId =
        given()
            .header("Authorization", bearerToken)
            .when()
            .get("/catalog/devices/{id}/contexts", deviceTypeId)
            .then()
            .statusCode(200)
            .extract()
            .path("data[0].id");

    // Create a division, branch, object, assign device and context
    String divisionId =
        given()
            .header("Authorization", bearerToken)
            .contentType(ContentType.JSON)
            .body("{\"name\": \"CtxDiv-" + UUID.randomUUID().toString().substring(0, 8) + "\"}")
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
            .body("{\"name\": \"CtxBranch\"}")
            .when()
            .post("/divisions/{d}/branches", divisionId)
            .then()
            .statusCode(201)
            .extract()
            .path("data.id");

    String objectId =
        given()
            .header("Authorization", bearerToken)
            .contentType(ContentType.JSON)
            .body("{\"branchId\": \"" + branchId + "\", \"name\": \"CtxObj\"}")
            .when()
            .post("/objects")
            .then()
            .statusCode(201)
            .extract()
            .path("data.id");

    given()
        .header("Authorization", bearerToken)
        .contentType(ContentType.JSON)
        .body("{\"deviceTypeId\": \"" + deviceTypeId + "\", \"quantityPhysical\": 1}")
        .when()
        .post("/objects/{oid}/devices", objectId)
        .then()
        .statusCode(201);

    String systemType =
        given()
            .header("Authorization", bearerToken)
            .when()
            .get("/catalog/devices/{id}/contexts", deviceTypeId)
            .then()
            .statusCode(200)
            .extract()
            .path("data[0].systemType");

    given()
        .header("Authorization", bearerToken)
        .contentType(ContentType.JSON)
        .body(
            "{\"deviceTypeId\": \""
                + deviceTypeId
                + "\", \"systemType\": \""
                + systemType
                + "\", \"quantityMaintained\": 1}")
        .when()
        .post("/objects/{oid}/assignments", objectId)
        .then()
        .statusCode(201);

    // Now try to delete the context — must return 409 CONTEXT_IN_USE
    given()
        .header("Authorization", bearerToken)
        .when()
        .delete("/catalog/devices/{dtId}/contexts/{cId}", deviceTypeId, contextId)
        .then()
        .statusCode(409)
        .body("error.code", equalTo(409));
  }

  // ── Repair type write endpoint tests ─────────────────────────────────────

  @Test
  void createRepairTypeReturns201() {
    given()
        .header("Authorization", bearerToken)
        .contentType(ContentType.JSON)
        .body(
            "{\"name\": \"TestRepair-"
                + UUID.randomUUID().toString().substring(0, 8)
                + "\", \"timeMinutes\": 30}")
        .when()
        .post("/catalog/repairs")
        .then()
        .statusCode(201)
        .body("data.id", notNullValue())
        .body("data.name", notNullValue());
  }

  @Test
  void updateRepairTypeReturns200() {
    String id =
        given()
            .header("Authorization", bearerToken)
            .contentType(ContentType.JSON)
            .body(
                "{\"name\": \"UpdRepair-"
                    + UUID.randomUUID().toString().substring(0, 8)
                    + "\", \"timeMinutes\": 10}")
            .when()
            .post("/catalog/repairs")
            .then()
            .statusCode(201)
            .extract()
            .path("data.id");

    given()
        .header("Authorization", bearerToken)
        .contentType(ContentType.JSON)
        .body("{\"name\": \"UpdatedRepair\", \"timeMinutes\": 20}")
        .when()
        .put("/catalog/repairs/{id}", id)
        .then()
        .statusCode(200)
        .body("data.name", equalTo("UpdatedRepair"));
  }

  @Test
  void deleteRepairTypeReturns204WhenNotInUse() {
    String id =
        given()
            .header("Authorization", bearerToken)
            .contentType(ContentType.JSON)
            .body(
                "{\"name\": \"DelRepair-"
                    + UUID.randomUUID().toString().substring(0, 8)
                    + "\", \"timeMinutes\": 5}")
            .when()
            .post("/catalog/repairs")
            .then()
            .statusCode(201)
            .extract()
            .path("data.id");

    given()
        .header("Authorization", bearerToken)
        .when()
        .delete("/catalog/repairs/{id}", id)
        .then()
        .statusCode(204);
  }

  // ── Cross-device context ownership tests ─────────────────────────────────

  @Test
  void updateContextWithCrossDeviceReturns404() {
    // Create two device types
    String deviceTypeId1 =
        given()
            .header("Authorization", bearerToken)
            .contentType(ContentType.JSON)
            .body("{\"name\": \"CrossA-" + UUID.randomUUID().toString().substring(0, 8) + "\"}")
            .when()
            .post("/catalog/devices")
            .then()
            .statusCode(201)
            .extract()
            .path("data.id");

    String deviceTypeId2 =
        given()
            .header("Authorization", bearerToken)
            .contentType(ContentType.JSON)
            .body("{\"name\": \"CrossB-" + UUID.randomUUID().toString().substring(0, 8) + "\"}")
            .when()
            .post("/catalog/devices")
            .then()
            .statusCode(201)
            .extract()
            .path("data.id");

    // Create a context on device type 1
    String contextId =
        given()
            .header("Authorization", bearerToken)
            .contentType(ContentType.JSON)
            .body("{\"systemType\": \"OS\", \"r1Minutes\": 5.0, \"r2Minutes\": 3.0}")
            .when()
            .post("/catalog/devices/{id}/contexts", deviceTypeId1)
            .then()
            .statusCode(201)
            .extract()
            .path("data.id");

    // Try to update the context through device type 2's URL
    given()
        .header("Authorization", bearerToken)
        .contentType(ContentType.JSON)
        .body("{\"r1Minutes\": 9.0, \"r2Minutes\": 9.0}")
        .when()
        .put("/catalog/devices/{dtId}/contexts/{cId}", deviceTypeId2, contextId)
        .then()
        .statusCode(404)
        .body("error.code", equalTo(404));
  }

  @Test
  void deleteContextWithCrossDeviceReturns404() {
    // Create two device types
    String deviceTypeId1 =
        given()
            .header("Authorization", bearerToken)
            .contentType(ContentType.JSON)
            .body("{\"name\": \"DelCrossA-" + UUID.randomUUID().toString().substring(0, 8) + "\"}")
            .when()
            .post("/catalog/devices")
            .then()
            .statusCode(201)
            .extract()
            .path("data.id");

    String deviceTypeId2 =
        given()
            .header("Authorization", bearerToken)
            .contentType(ContentType.JSON)
            .body("{\"name\": \"DelCrossB-" + UUID.randomUUID().toString().substring(0, 8) + "\"}")
            .when()
            .post("/catalog/devices")
            .then()
            .statusCode(201)
            .extract()
            .path("data.id");

    // Create a context on device type 1
    String contextId =
        given()
            .header("Authorization", bearerToken)
            .contentType(ContentType.JSON)
            .body("{\"systemType\": \"OS\", \"r1Minutes\": 5.0, \"r2Minutes\": 3.0}")
            .when()
            .post("/catalog/devices/{id}/contexts", deviceTypeId1)
            .then()
            .statusCode(201)
            .extract()
            .path("data.id");

    // Try to delete the context through device type 2's URL
    given()
        .header("Authorization", bearerToken)
        .when()
        .delete("/catalog/devices/{dtId}/contexts/{cId}", deviceTypeId2, contextId)
        .then()
        .statusCode(404)
        .body("error.code", equalTo(404));
  }
}
