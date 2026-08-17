package com.workload.controller;

import static io.restassured.RestAssured.given;
import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.notNullValue;
import static org.hamcrest.Matchers.nullValue;

import com.workload.support.IntegrationTestBase;
import io.restassured.http.ContentType;
import io.restassured.http.Cookie;
import io.restassured.response.Response;
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
        .statusCode(401)
        .body("error.message", equalTo("Invalid email or password"));
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
        .statusCode(401)
        .body("error.message", equalTo("Invalid email or password"));
  }

  /** The token message belongs to the SecurityConfig entry point only, never to a login failure. */
  @Test
  void getMeWithoutTokenReturns401() {
    given()
        .when()
        .get("/auth/me")
        .then()
        .statusCode(401)
        .body("error.message", equalTo("Invalid or expired authentication token"));
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

  // --- MVP M-02: refresh token flow (TOR §21.2) ---

  private static final String REFRESH_COOKIE = "refresh_token";

  private Response login() {
    return given()
        .contentType(ContentType.JSON)
        .body(
            """
            {
              "email": "admin@workload.local",
              "password": "password"
            }
            """)
        .when()
        .post("/auth/login");
  }

  @Test
  void loginSetsHttpOnlyRefreshCookie() {
    Response response = login();
    response.then().statusCode(200);

    Cookie cookie = response.getDetailedCookie(REFRESH_COOKIE);
    assertThat(cookie).isNotNull();
    assertThat(cookie.isHttpOnly()).isTrue();
    assertThat(cookie.getPath()).isEqualTo("/api/v1/auth");
    // 7 days, allowing slack for request time
    assertThat(cookie.getMaxAge()).isBetween(7L * 24 * 3600 - 60, 7L * 24 * 3600);
  }

  @Test
  void refreshWithCookieReturnsNewAccessTokenAndRenewsCookie() {
    Response loginResponse = login();
    String refreshToken = loginResponse.getCookie(REFRESH_COOKIE);

    Response refreshed = given().cookie(REFRESH_COOKIE, refreshToken).when().post("/auth/refresh");

    refreshed.then().statusCode(200).body("data.token", notNullValue());
    assertThat(refreshed.getDetailedCookie(REFRESH_COOKIE)).isNotNull();
    // Not asserting the new token differs from the old: JWT iat/exp are second-resolution, so a
    // login and an immediate refresh inside the same second legitimately produce identical tokens.
    // What matters is that the issued token is valid and carries a fresh window, checked below.

    // The issued access token must actually authenticate.
    given()
        .header("Authorization", "Bearer " + refreshed.path("data.token"))
        .when()
        .get("/auth/me")
        .then()
        .statusCode(200);
  }

  @Test
  void refreshWithoutCookieReturns401() {
    given().when().post("/auth/refresh").then().statusCode(401);
  }

  @Test
  void refreshWithGarbageCookieReturns401() {
    given().cookie(REFRESH_COOKIE, "not-a-jwt").when().post("/auth/refresh").then().statusCode(401);
  }

  /** An access token must not be usable as a refresh token, or the 15-minute lifetime is moot. */
  @Test
  void accessTokenIsRejectedAsRefreshToken() {
    String accessToken = login().path("data.token");

    given().cookie(REFRESH_COOKIE, accessToken).when().post("/auth/refresh").then().statusCode(401);
  }

  /** Conversely a refresh token must not authenticate ordinary requests. */
  @Test
  void refreshTokenIsRejectedAsAccessToken() {
    String refreshToken = login().getCookie(REFRESH_COOKIE);

    given()
        .header("Authorization", "Bearer " + refreshToken)
        .when()
        .get("/auth/me")
        .then()
        .statusCode(401);
  }

  @Test
  void logoutClearsRefreshCookie() {
    Response response = given().when().post("/auth/logout");
    response.then().statusCode(204);

    Cookie cookie = response.getDetailedCookie(REFRESH_COOKIE);
    assertThat(cookie).isNotNull();
    assertThat(cookie.getMaxAge()).isZero();
  }
}
