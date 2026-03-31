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

class ObjectControllerIT extends IntegrationTestBase {

    private String bearerToken;
    private String branchId;

    @BeforeEach
    void authenticate() {
        bearerToken = authenticationTestHelper.loginAsAdmin();

        // Create a division and branch for object tests
        String divisionId =
                given()
                        .header("Authorization", bearerToken)
                        .contentType(ContentType.JSON)
                        .body("""
                                {"name": "ObjTestDiv-%s"}
                                """.formatted(UUID.randomUUID().toString().substring(0, 8)))
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
                        .body("""
                                {"name": "ObjTestBranch"}
                                """)
                        .when()
                        .post("/divisions/{divId}/branches", divisionId)
                        .then()
                        .statusCode(201)
                        .extract()
                        .path("data.id");
    }

    @Test
    void createObjectReturns201() {
        given()
                .header("Authorization", bearerToken)
                .contentType(ContentType.JSON)
                .body("""
                        {"branchId": "%s", "name": "Test Object", "importSeqNo": 1}
                        """.formatted(branchId))
                .when()
                .post("/objects")
                .then()
                .statusCode(201)
                .body("data.name", equalTo("Test Object"))
                .body("data.importSeqNo", equalTo(1))
                .body("data.branchId", equalTo(branchId));
    }

    @Test
    void createObjectWithInvalidBranchReturns404() {
        given()
                .header("Authorization", bearerToken)
                .contentType(ContentType.JSON)
                .body("""
                        {"branchId": "%s", "name": "Bad Object"}
                        """.formatted(UUID.randomUUID()))
                .when()
                .post("/objects")
                .then()
                .statusCode(404)
                .body("error.code", equalTo("ENTITY_NOT_FOUND"));
    }

    @Test
    void getObjectsReturnsList() {
        given()
                .header("Authorization", bearerToken)
                .contentType(ContentType.JSON)
                .body("""
                        {"branchId": "%s", "name": "ListObj"}
                        """.formatted(branchId))
                .when()
                .post("/objects")
                .then()
                .statusCode(201);

        given()
                .header("Authorization", bearerToken)
                .when()
                .get("/objects")
                .then()
                .statusCode(200)
                .body("data", hasSize(greaterThanOrEqualTo(1)));
    }

    @Test
    void getObjectByIdReturns200() {
        String objectId =
                given()
                        .header("Authorization", bearerToken)
                        .contentType(ContentType.JSON)
                        .body("""
                                {"branchId": "%s", "name": "GetById"}
                                """.formatted(branchId))
                        .when()
                        .post("/objects")
                        .then()
                        .statusCode(201)
                        .extract()
                        .path("data.id");

        given()
                .header("Authorization", bearerToken)
                .when()
                .get("/objects/{id}", objectId)
                .then()
                .statusCode(200)
                .body("data.name", equalTo("GetById"));
    }

    @Test
    void updateObjectReturns200() {
        String objectId =
                given()
                        .header("Authorization", bearerToken)
                        .contentType(ContentType.JSON)
                        .body("""
                                {"branchId": "%s", "name": "OldObjName"}
                                """.formatted(branchId))
                        .when()
                        .post("/objects")
                        .then()
                        .statusCode(201)
                        .extract()
                        .path("data.id");

        given()
                .header("Authorization", bearerToken)
                .contentType(ContentType.JSON)
                .body("""
                        {"name": "NewObjName", "importSeqNo": 42}
                        """)
                .when()
                .put("/objects/{id}", objectId)
                .then()
                .statusCode(200)
                .body("data.name", equalTo("NewObjName"))
                .body("data.importSeqNo", equalTo(42));
    }

    @Test
    void deleteObjectReturns204() {
        String objectId =
                given()
                        .header("Authorization", bearerToken)
                        .contentType(ContentType.JSON)
                        .body("""
                                {"branchId": "%s", "name": "ToDelete"}
                                """.formatted(branchId))
                        .when()
                        .post("/objects")
                        .then()
                        .statusCode(201)
                        .extract()
                        .path("data.id");

        given()
                .header("Authorization", bearerToken)
                .when()
                .delete("/objects/{id}", objectId)
                .then()
                .statusCode(204);

        given()
                .header("Authorization", bearerToken)
                .when()
                .get("/objects/{id}", objectId)
                .then()
                .statusCode(404);
    }
}
