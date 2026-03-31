package com.workload.controller;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.notNullValue;
import static org.hamcrest.Matchers.nullValue;

import com.workload.support.IntegrationTestBase;
import io.restassured.http.ContentType;
import org.junit.jupiter.api.Test;

class AuthControllerIT extends IntegrationTestBase {

    @Test
    void loginWithValidCredentialsReturnsToken() {
        given()
                .contentType(ContentType.JSON)
                .body(
                        """
                                {
                                  "email": "admin@workload.local",
                                  "password": "password"
                                }
                                """)
                .when()
                .post("/auth/login")
                .then()
                .statusCode(200)
                .body("data.token", notNullValue())
                .body("data.user.email", notNullValue())
                .body("error", nullValue());
    }

    @Test
    void loginWithWrongPasswordReturns401() {
        given()
                .contentType(ContentType.JSON)
                .body(
                        """
                                {
                                  "email": "admin@workload.local",
                                  "password": "wrongpassword"
                                }
                                """)
                .when()
                .post("/auth/login")
                .then()
                .statusCode(401);
    }

    @Test
    void loginWithUnknownEmailReturns401() {
        given()
                .contentType(ContentType.JSON)
                .body(
                        """
                                {
                                  "email": "unknown@example.com",
                                  "password": "password"
                                }
                                """)
                .when()
                .post("/auth/login")
                .then()
                .statusCode(401);
    }

    @Test
    void getMeWithoutTokenReturns401() {
        given().when().get("/auth/me").then().statusCode(401);
    }

    @Test
    void getMeWithValidTokenReturns200() {
        String bearerToken = authenticationTestHelper.loginAsAdmin();

        given()
                .header("Authorization", bearerToken)
                .when()
                .get("/auth/me")
                .then()
                .statusCode(200)
                .body("data.email", notNullValue());
    }

    @Test
    void logoutReturns204() {
        given().when().post("/auth/logout").then().statusCode(204);
    }
}
