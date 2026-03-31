package com.workload.controller;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.greaterThanOrEqualTo;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.notNullValue;

import com.workload.support.IntegrationTestBase;
import io.restassured.http.ContentType;
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
                .get("/catalog/device-types")
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
                        .get("/catalog/device-types")
                        .then()
                        .statusCode(200)
                        .extract()
                        .path("data[0].id");

        given()
                .header("Authorization", bearerToken)
                .when()
                .get("/catalog/device-types/{id}", id)
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
                        .get("/catalog/device-types")
                        .then()
                        .statusCode(200)
                        .extract()
                        .path("data[0].id");

        given()
                .header("Authorization", bearerToken)
                .when()
                .get("/catalog/device-types/{id}/contexts", id)
                .then()
                .statusCode(200)
                .body("data", hasSize(greaterThanOrEqualTo(1)));
    }

    @Test
    void getRepairTypesReturnsSeededData() {
        given()
                .header("Authorization", bearerToken)
                .when()
                .get("/catalog/repair-types")
                .then()
                .statusCode(200)
                .body("data", hasSize(greaterThanOrEqualTo(1)))
                .body("data[0].id", notNullValue());
    }
}
