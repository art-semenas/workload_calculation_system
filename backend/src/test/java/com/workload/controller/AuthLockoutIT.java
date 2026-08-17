package com.workload.controller;

import static io.restassured.RestAssured.given;
import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.matchesPattern;

import com.workload.entity.Role;
import com.workload.entity.User;
import com.workload.repository.UserRepository;
import com.workload.support.IntegrationTestBase;
import io.restassured.http.ContentType;
import java.time.OffsetDateTime;
import java.util.UUID;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;

/** MVP M-02 §21.3 — brute-force protection: 5 consecutive failures lock the account for 30 min. */
class AuthLockoutIT extends IntegrationTestBase {

  private static final String PASSWORD = "correct-horse";
  private static final int MAX_ATTEMPTS = 5;

  @Autowired private UserRepository userRepository;
  @Autowired private PasswordEncoder passwordEncoder;

  private String email;

  @BeforeEach
  void createVictim() {
    // A dedicated user per test: locking the shared admin would break every other suite.
    email = "lockout-" + UUID.randomUUID() + "@workload.local";
    userRepository.save(
        User.builder()
            .id(UUID.randomUUID())
            .email(email)
            .name("Lockout Test")
            .passwordHash(passwordEncoder.encode(PASSWORD))
            .role(Role.VIEWER)
            .capacityFte(java.math.BigDecimal.ONE)
            .active(true)
            .requiresActivation(false)
            .createdAt(OffsetDateTime.now())
            .updatedAt(OffsetDateTime.now())
            .build());
  }

  @AfterEach
  void removeVictim() {
    userRepository.findByEmail(email).ifPresent(userRepository::delete);
  }

  private io.restassured.response.Response attemptLogin(String password) {
    return given()
        .contentType(ContentType.JSON)
        .body("{\"email\": \"" + email + "\", \"password\": \"" + password + "\"}")
        .when()
        .post("/auth/login");
  }

  @Test
  void failedAttemptsIncrementTheCounter() {
    attemptLogin("wrong").then().statusCode(401);
    attemptLogin("wrong").then().statusCode(401);

    assertThat(userRepository.findByEmail(email).orElseThrow().getFailedLoginCount()).isEqualTo(2);
  }

  @Test
  void accountLocksAfterFiveFailedAttempts() {
    for (int i = 0; i < MAX_ATTEMPTS; i++) {
      attemptLogin("wrong").then().statusCode(401);
    }

    // The correct password must now be refused too — that is what makes it a lockout.
    attemptLogin(PASSWORD).then().statusCode(401).body("error.message", containsString("locked"));

    User locked = userRepository.findByEmail(email).orElseThrow();
    assertThat(locked.getLockedUntil()).isNotNull().isAfter(OffsetDateTime.now());
  }

  /**
   * The retry time is stated as a duration, not a wall clock. A clock time formatted server-side
   * lands in the server's zone (UTC in the container), so a user in UTC+3 was being told a time
   * that had already passed. A duration is correct for every reader with no zone to reason about.
   */
  @Test
  void lockoutMessageStatesTheWaitAsADuration() {
    for (int i = 0; i < MAX_ATTEMPTS; i++) {
      attemptLogin("wrong").then().statusCode(401);
    }

    attemptLogin(PASSWORD)
        .then()
        .statusCode(401)
        .body("error.message", containsString("Account locked."))
        .body("error.message", matchesPattern("Account locked\\. Try again in \\d+ minutes\\."));
  }

  @Test
  void successfulLoginResetsFailedCount() {
    attemptLogin("wrong").then().statusCode(401);
    attemptLogin("wrong").then().statusCode(401);
    attemptLogin("wrong").then().statusCode(401);

    attemptLogin(PASSWORD).then().statusCode(200);

    User user = userRepository.findByEmail(email).orElseThrow();
    assertThat(user.getFailedLoginCount()).isZero();
    assertThat(user.getLockedUntil()).isNull();
  }

  /** Once the window passes the user gets a clean slate, not one attempt before re-locking. */
  @Test
  void expiredLockAllowsLoginAndClearsCounter() {
    User user = userRepository.findByEmail(email).orElseThrow();
    user.setFailedLoginCount(MAX_ATTEMPTS);
    user.setLockedUntil(OffsetDateTime.now().minusMinutes(1));
    userRepository.save(user);

    attemptLogin(PASSWORD).then().statusCode(200);

    User after = userRepository.findByEmail(email).orElseThrow();
    assertThat(after.getFailedLoginCount()).isZero();
    assertThat(after.getLockedUntil()).isNull();
  }

  @Test
  void expiredLockGivesAFullFreshSetOfAttempts() {
    User user = userRepository.findByEmail(email).orElseThrow();
    user.setFailedLoginCount(MAX_ATTEMPTS);
    user.setLockedUntil(OffsetDateTime.now().minusMinutes(1));
    userRepository.save(user);

    // One wrong attempt after expiry must not immediately re-lock the account.
    attemptLogin("wrong").then().statusCode(401);

    User after = userRepository.findByEmail(email).orElseThrow();
    assertThat(after.getFailedLoginCount()).isEqualTo(1);
    assertThat(after.getLockedUntil()).isNull();
  }

  @Test
  void lockedAccountStaysLockedEvenWithCorrectPassword() {
    User user = userRepository.findByEmail(email).orElseThrow();
    user.setFailedLoginCount(MAX_ATTEMPTS);
    user.setLockedUntil(OffsetDateTime.now().plusMinutes(30));
    userRepository.save(user);

    attemptLogin(PASSWORD).then().statusCode(401).body("error.message", containsString("locked"));
  }
}
