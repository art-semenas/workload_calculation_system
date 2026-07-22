package com.workload.controller;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.nullValue;

import com.workload.support.IntegrationTestBase;
import io.restassured.http.ContentType;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

/**
 * Verifies that Spring MVC framework exceptions surface as the correct status, not a blanket 500.
 */
class ErrorHandlingIT extends IntegrationTestBase {

  private String bearerToken;

  @BeforeEach
  void authenticate() {
    bearerToken = authenticationTestHelper.loginAsAdmin();
  }

  @Test
  void unknownPathReturns404Envelope() {
    given()
        .header("Authorization", bearerToken)
        .when()
        .get("/nonexistent-path")
        .then()
        .statusCode(404)
        .body("data", nullValue())
        .body("error.code", equalTo(404))
        .body("error.message", equalTo("Resource not found"));
  }

  @Test
  void wrongHttpMethodOnExistingRouteReturns405Envelope() {
    given()
        .header("Authorization", bearerToken)
        .when()
        .delete("/divisions")
        .then()
        .statusCode(405)
        .body("data", nullValue())
        .body("error.code", equalTo(405))
        .body("error.message", equalTo("Method not allowed"));
  }

  @Test
  void mistypedPathVariableReturns400Envelope() {
    given()
        .header("Authorization", bearerToken)
        .when()
        .get("/divisions/not-a-uuid")
        .then()
        .statusCode(400)
        .body("error.code", equalTo(400))
        .body("error.message", equalTo("Invalid value for parameter 'id'"));
  }

  @Test
  void unsupportedMediaTypeReturns415Envelope() {
    given()
        .header("Authorization", bearerToken)
        .contentType(ContentType.TEXT)
        .body("name=Brest")
        .when()
        .post("/divisions")
        .then()
        .statusCode(415)
        .body("error.code", equalTo(415))
        .body("error.message", equalTo("Unsupported media type"));
  }
}
