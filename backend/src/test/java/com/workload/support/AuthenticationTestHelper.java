package com.workload.support;

import static io.restassured.RestAssured.given;

import com.workload.entity.Role;
import com.workload.entity.User;
import com.workload.repository.UserRepository;
import io.restassured.http.ContentType;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
public class AuthenticationTestHelper {

  private static final String ADMIN_EMAIL = "admin@workload.local";
  private static final String ADMIN_PASSWORD = "password";

  public String bearerToken(String jwt) {
    return "Bearer " + jwt;
  }

  private static final String TEST_PASSWORD = "test-password";

  private final UserRepository userRepository;
  private final PasswordEncoder passwordEncoder;

  public AuthenticationTestHelper(UserRepository userRepository, PasswordEncoder passwordEncoder) {
    this.userRepository = userRepository;
    this.passwordEncoder = passwordEncoder;
  }

  /**
   * Creates an active user with the given role, optionally scoped to a division, and returns its
   * bearer token. Each call makes a fresh account so RBAC tests cannot interfere with each other.
   */
  public String loginAs(Role role, UUID divisionId) {
    String email = role.getValue() + "-" + UUID.randomUUID() + "@workload.local";
    userRepository.save(
        User.builder()
            .id(UUID.randomUUID())
            .email(email)
            .name("RBAC " + role.getValue())
            .passwordHash(passwordEncoder.encode(TEST_PASSWORD))
            .role(role)
            .divisionId(divisionId)
            .capacityFte(BigDecimal.ONE)
            .active(true)
            .requiresActivation(false)
            .createdAt(OffsetDateTime.now())
            .updatedAt(OffsetDateTime.now())
            .build());
    return login(email, TEST_PASSWORD);
  }

  public String loginAs(Role role) {
    return loginAs(role, null);
  }

  public String login(String email, String password) {
    String token =
        given()
            .contentType(ContentType.JSON)
            .body("{\"email\": \"" + email + "\", \"password\": \"" + password + "\"}")
            .when()
            .post("/auth/login")
            .then()
            .statusCode(200)
            .extract()
            .path("data.token");
    return bearerToken(token);
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
