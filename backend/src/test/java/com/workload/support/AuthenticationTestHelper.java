package com.workload.support;

import static io.restassured.RestAssured.given;

import io.restassured.http.ContentType;
import org.springframework.stereotype.Component;

@Component
public class AuthenticationTestHelper {

  private static final String ADMIN_EMAIL = "admin@workload.local";
  private static final String ADMIN_PASSWORD = "password";

  public String bearerToken(String jwt) {
    return "Bearer " + jwt;
  }

  /**
   * Logs in as the seeded admin user and returns the bearer token string (including the "Bearer "
   * prefix) for use in authenticated requests.
   */
  public String loginAsAdmin() {
    String token =
        given()
            .contentType(ContentType.JSON)
            .body(
                """
                {
                  "email": "%s",
                  "password": "%s"
                }
                """
                    .formatted(ADMIN_EMAIL, ADMIN_PASSWORD))
            .when()
            .post("/auth/login")
            .then()
            .statusCode(200)
            .extract()
            .path("data.token");
    return bearerToken(token);
  }
}
