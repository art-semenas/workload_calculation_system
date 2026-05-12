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

class EquipmentControllerIT extends IntegrationTestBase {

  private String bearerToken;
  private String objectId;
  private String deviceTypeId;

  @BeforeEach
  void setUp() {
    bearerToken = authenticationTestHelper.loginAsAdmin();

    // Create division → branch → object
    String divisionId =
        given()
            .header("Authorization", bearerToken)
            .contentType(ContentType.JSON)
            .body(
                """
                {"name": "EqDiv-%s"}
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
            .header("Authorization", bearerToken)
            .contentType(ContentType.JSON)
            .body(
                """
                {"name": "EqBranch"}
                """)
            .when()
            .post("/divisions/{divId}/branches", divisionId)
            .then()
            .statusCode(201)
            .extract()
            .path("data.id");

    objectId =
        given()
            .header("Authorization", bearerToken)
            .contentType(ContentType.JSON)
            .body(
                """
                {"branchId": "%s", "name": "EqObject"}
                """
                    .formatted(branchId))
            .when()
            .post("/objects")
            .then()
            .statusCode(201)
            .extract()
            .path("data.id");

    // Get first seeded device type
    deviceTypeId =
        given()
            .header("Authorization", bearerToken)
            .when()
            .get("/catalog/devices")
            .then()
            .statusCode(200)
            .body("data", hasSize(greaterThanOrEqualTo(1)))
            .extract()
            .path("data[0].id");
  }

  @Test
  void addDeviceReturns201() {
    given()
        .header("Authorization", bearerToken)
        .contentType(ContentType.JSON)
        .body(
            """
            {"deviceTypeId": "%s", "quantityPhysical": 2.00}
            """
                .formatted(deviceTypeId))
        .when()
        .post("/objects/{oid}/devices", objectId)
        .then()
        .statusCode(201)
        .body("data.deviceTypeId", equalTo(deviceTypeId))
        .body("data.deviceTypeName", notNullValue());
  }

  @Test
  void getDevicesReturnsListAfterAdd() {
    given()
        .header("Authorization", bearerToken)
        .contentType(ContentType.JSON)
        .body(
            """
            {"deviceTypeId": "%s", "quantityPhysical": 1.00}
            """
                .formatted(deviceTypeId))
        .when()
        .post("/objects/{oid}/devices", objectId)
        .then()
        .statusCode(201);

    given()
        .header("Authorization", bearerToken)
        .when()
        .get("/objects/{oid}/devices", objectId)
        .then()
        .statusCode(200)
        .body("data", hasSize(greaterThanOrEqualTo(1)));
  }

  @Test
  void deleteDeviceReturns204() {
    given()
        .header("Authorization", bearerToken)
        .contentType(ContentType.JSON)
        .body(
            """
            {"deviceTypeId": "%s", "quantityPhysical": 1.00}
            """
                .formatted(deviceTypeId))
        .when()
        .post("/objects/{oid}/devices", objectId)
        .then()
        .statusCode(201);

    given()
        .header("Authorization", bearerToken)
        .when()
        .delete("/objects/{oid}/devices/{dtid}", objectId, deviceTypeId)
        .then()
        .statusCode(204);
  }

  @Test
  void addAssignmentWithoutInventoryReturns422() {
    // No device added to inventory → DEVICE_NOT_IN_INVENTORY
    given()
        .header("Authorization", bearerToken)
        .contentType(ContentType.JSON)
        .body(
            """
            {"deviceTypeId": "%s", "systemType": "OS", "quantityMaintained": 1.00}
            """
                .formatted(deviceTypeId))
        .when()
        .post("/objects/{oid}/assignments", objectId)
        .then()
        .statusCode(422)
        .body("error.code", equalTo(422));
  }

  @Test
  void addAssignmentWithInventoryReturns201() {
    // First add device to inventory
    given()
        .header("Authorization", bearerToken)
        .contentType(ContentType.JSON)
        .body(
            """
            {"deviceTypeId": "%s", "quantityPhysical": 2.00}
            """
                .formatted(deviceTypeId))
        .when()
        .post("/objects/{oid}/devices", objectId)
        .then()
        .statusCode(201);

    // Now add assignment — uses seeded context for first device type
    given()
        .header("Authorization", bearerToken)
        .contentType(ContentType.JSON)
        .body(
            """
            {"deviceTypeId": "%s", "systemType": "OS", "quantityMaintained": 1.00}
            """
                .formatted(deviceTypeId))
        .when()
        .post("/objects/{oid}/assignments", objectId)
        .then()
        .statusCode(201)
        .body("data.objectId", equalTo(objectId))
        .body("data.contextId", notNullValue());
  }

  @Test
  void updateDeviceReturns422WhenBodyDeviceTypeIdMismatchesPath() {
    // Create a device via POST
    given()
        .header("Authorization", bearerToken)
        .contentType(ContentType.JSON)
        .body("{\"deviceTypeId\": \"" + deviceTypeId + "\", \"quantityPhysical\": 1}")
        .when()
        .post("/objects/{oid}/devices", objectId)
        .then()
        .statusCode(201);

    // GET a second device type id from the catalog
    String secondDeviceTypeId =
        given()
            .header("Authorization", bearerToken)
            .when()
            .get("/catalog/devices")
            .then()
            .statusCode(200)
            .extract()
            .path("data[1].id");

    // PUT with a different deviceTypeId in the body — must be rejected (422)
    given()
        .header("Authorization", bearerToken)
        .contentType(ContentType.JSON)
        .body("{\"deviceTypeId\": \"" + secondDeviceTypeId + "\", \"quantityPhysical\": 5}")
        .when()
        .put("/objects/{oid}/devices/{dtId}", objectId, deviceTypeId)
        .then()
        .statusCode(422);
  }

  @Test
  void updateDeviceReturns200WhenBodyMatchesPath() {
    // Create a device via POST
    given()
        .header("Authorization", bearerToken)
        .contentType(ContentType.JSON)
        .body("{\"deviceTypeId\": \"" + deviceTypeId + "\", \"quantityPhysical\": 1}")
        .when()
        .post("/objects/{oid}/devices", objectId)
        .then()
        .statusCode(201);

    // PUT with matching deviceTypeId in body and path — must succeed
    given()
        .header("Authorization", bearerToken)
        .contentType(ContentType.JSON)
        .body("{\"deviceTypeId\": \"" + deviceTypeId + "\", \"quantityPhysical\": 5}")
        .when()
        .put("/objects/{oid}/devices/{dtId}", objectId, deviceTypeId)
        .then()
        .statusCode(200);
  }

  @Test
  void getAssignmentsReturnsListAfterAdd() {
    // Setup device + assignment
    given()
        .header("Authorization", bearerToken)
        .contentType(ContentType.JSON)
        .body(
            """
            {"deviceTypeId": "%s", "quantityPhysical": 2.00}
            """
                .formatted(deviceTypeId))
        .when()
        .post("/objects/{oid}/devices", objectId);

    given()
        .header("Authorization", bearerToken)
        .contentType(ContentType.JSON)
        .body(
            """
            {"deviceTypeId": "%s", "systemType": "OS", "quantityMaintained": 1.00}
            """
                .formatted(deviceTypeId))
        .when()
        .post("/objects/{oid}/assignments", objectId);

    given()
        .header("Authorization", bearerToken)
        .when()
        .get("/objects/{oid}/assignments", objectId)
        .then()
        .statusCode(200)
        .body("data", hasSize(greaterThanOrEqualTo(1)));
  }

  @Test
  void deleteDeviceCascadesSystemAssignments() {
    // Add device to inventory
    given()
        .header("Authorization", bearerToken)
        .contentType(ContentType.JSON)
        .body(
            """
            {"deviceTypeId": "%s", "quantityPhysical": 2.00}
            """
                .formatted(deviceTypeId))
        .when()
        .post("/objects/{oid}/devices", objectId)
        .then()
        .statusCode(201);

    // Add assignment for that device
    given()
        .header("Authorization", bearerToken)
        .contentType(ContentType.JSON)
        .body(
            """
            {"deviceTypeId": "%s", "systemType": "OS", "quantityMaintained": 1.00}
            """
                .formatted(deviceTypeId))
        .when()
        .post("/objects/{oid}/assignments", objectId)
        .then()
        .statusCode(201);

    // Delete the device — TOR §7.3: cascades all system assignments
    given()
        .header("Authorization", bearerToken)
        .when()
        .delete("/objects/{oid}/devices/{dtid}", objectId, deviceTypeId)
        .then()
        .statusCode(204);

    // Verify assignments are gone
    given()
        .header("Authorization", bearerToken)
        .when()
        .get("/objects/{oid}/assignments", objectId)
        .then()
        .statusCode(200)
        .body("data", hasSize(0));
  }
}
