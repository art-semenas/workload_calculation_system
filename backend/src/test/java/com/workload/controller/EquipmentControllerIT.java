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
                        .body("""
                                {"name": "EqDiv-%s"}
                                """.formatted(UUID.randomUUID().toString().substring(0, 8)))
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
                        .body("""
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
                        .body("""
                                {"branchId": "%s", "name": "EqObject"}
                                """.formatted(branchId))
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
                        .get("/catalog/device-types")
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
                .body("""
                        {"deviceTypeId": "%s", "quantityPhysical": 2.00}
                        """.formatted(deviceTypeId))
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
                .body("""
                        {"deviceTypeId": "%s", "quantityPhysical": 1.00}
                        """.formatted(deviceTypeId))
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
                .body("""
                        {"deviceTypeId": "%s", "quantityPhysical": 1.00}
                        """.formatted(deviceTypeId))
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
                .body("""
                        {"deviceTypeId": "%s", "systemType": "OS", "quantityMaintained": 1.00}
                        """.formatted(deviceTypeId))
                .when()
                .post("/objects/{oid}/assignments", objectId)
                .then()
                .statusCode(422)
                .body("error.code", equalTo("DEVICE_NOT_IN_INVENTORY"));
    }

    @Test
    void addAssignmentWithInventoryReturns201() {
        // First add device to inventory
        given()
                .header("Authorization", bearerToken)
                .contentType(ContentType.JSON)
                .body("""
                        {"deviceTypeId": "%s", "quantityPhysical": 2.00}
                        """.formatted(deviceTypeId))
                .when()
                .post("/objects/{oid}/devices", objectId)
                .then()
                .statusCode(201);

        // Now add assignment — uses seeded context for first device type
        given()
                .header("Authorization", bearerToken)
                .contentType(ContentType.JSON)
                .body("""
                        {"deviceTypeId": "%s", "systemType": "OS", "quantityMaintained": 1.00}
                        """.formatted(deviceTypeId))
                .when()
                .post("/objects/{oid}/assignments", objectId)
                .then()
                .statusCode(201)
                .body("data.objectId", equalTo(objectId))
                .body("data.contextId", notNullValue());
    }

    @Test
    void getAssignmentsReturnsListAfterAdd() {
        // Setup device + assignment
        given()
                .header("Authorization", bearerToken)
                .contentType(ContentType.JSON)
                .body("""
                        {"deviceTypeId": "%s", "quantityPhysical": 2.00}
                        """.formatted(deviceTypeId))
                .when()
                .post("/objects/{oid}/devices", objectId);

        given()
                .header("Authorization", bearerToken)
                .contentType(ContentType.JSON)
                .body("""
                        {"deviceTypeId": "%s", "systemType": "OS", "quantityMaintained": 1.00}
                        """.formatted(deviceTypeId))
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
}
