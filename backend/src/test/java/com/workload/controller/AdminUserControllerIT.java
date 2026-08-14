package com.workload.controller;

import static io.restassured.RestAssured.given;
import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.everyItem;
import static org.hamcrest.Matchers.greaterThanOrEqualTo;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.notNullValue;

import com.workload.entity.Role;
import com.workload.entity.User;
import com.workload.repository.UserRepository;
import com.workload.support.IntegrationTestBase;
import io.restassured.http.ContentType;
import java.time.OffsetDateTime;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

/** MVP M-02 — {@code /admin/users} management endpoints (admin only). */
class AdminUserControllerIT extends IntegrationTestBase {

  @Autowired private UserRepository userRepository;

  private String admin;

  @BeforeEach
  void authenticate() {
    admin = authenticationTestHelper.loginAsAdmin();
  }

  // --- Access control ---

  @Test
  void viewerCannotListUsers() {
    String viewer = authenticationTestHelper.loginAs(Role.VIEWER);

    given()
        .header("Authorization", viewer)
        .when()
        .get("/admin/users")
        .then()
        .statusCode(403)
        .body("error.code", equalTo(403));
  }

  @Test
  void editorCannotCreateUsers() {
    String editor = authenticationTestHelper.loginAs(Role.EDITOR);

    given()
        .header("Authorization", editor)
        .contentType(ContentType.JSON)
        .body(createBody("editor-denied", "viewer"))
        .when()
        .post("/admin/users")
        .then()
        .statusCode(403);
  }

  @Test
  void unauthenticatedRequestReturns401() {
    given().when().get("/admin/users").then().statusCode(401);
  }

  // --- GET /admin/users ---

  @Test
  void listUsersReturnsPagedResult() {
    given()
        .header("Authorization", admin)
        .when()
        .get("/admin/users")
        .then()
        .statusCode(200)
        .body("data.content", hasSize(greaterThanOrEqualTo(1)))
        .body("data.content[0].email", notNullValue())
        .body("data.totalElements", greaterThanOrEqualTo(1));
  }

  @Test
  void listUsersFiltersByRole() {
    authenticationTestHelper.loginAs(Role.VIEWER);

    given()
        .header("Authorization", admin)
        .queryParam("role", "viewer")
        .when()
        .get("/admin/users")
        .then()
        .statusCode(200)
        .body("data.content", hasSize(greaterThanOrEqualTo(1)))
        .body("data.content.role", everyItem(equalTo("viewer")));
  }

  @Test
  void listUsersFiltersByActiveFlag() {
    String id = createUser("inactive-filter", "viewer");
    given().header("Authorization", admin).when().delete("/admin/users/{id}", id).then();

    given()
        .header("Authorization", admin)
        .queryParam("is_active", false)
        .when()
        .get("/admin/users")
        .then()
        .statusCode(200)
        .body("data.content.active", everyItem(equalTo(false)));
  }

  @Test
  void listUsersRejectsUnknownRoleFilter() {
    given()
        .header("Authorization", admin)
        .queryParam("role", "wizard")
        .when()
        .get("/admin/users")
        .then()
        .statusCode(400)
        .body("error.message", equalTo("Invalid value for parameter 'role'"));
  }

  // --- POST /admin/users ---

  @Test
  void createUserReturns201() {
    given()
        .header("Authorization", admin)
        .contentType(ContentType.JSON)
        .body(createBody("created-editor", "editor"))
        .when()
        .post("/admin/users")
        .then()
        .statusCode(201)
        .body("data.id", notNullValue())
        .body("data.role", equalTo("editor"))
        .body("data.active", equalTo(true))
        .body("data.requiresActivation", equalTo(false));
  }

  @Test
  void createUserWithoutPasswordCreatesPlaceholder() {
    String email = "placeholder-" + UUID.randomUUID() + "@workload.local";

    given()
        .header("Authorization", admin)
        .contentType(ContentType.JSON)
        .body("{\"email\": \"" + email + "\", \"name\": \"Placeholder\", \"role\": \"viewer\"}")
        .when()
        .post("/admin/users")
        .then()
        .statusCode(201)
        .body("data.active", equalTo(false))
        .body("data.requiresActivation", equalTo(true));
  }

  @Test
  void createEngineerThroughAdminUsersReturns422() {
    given()
        .header("Authorization", admin)
        .contentType(ContentType.JSON)
        .body(createBody("engineer-rejected", "engineer"))
        .when()
        .post("/admin/users")
        .then()
        .statusCode(422)
        .body("error.code", equalTo(422))
        .body(
            "error.message", equalTo("Engineer accounts cannot be created through this endpoint"));
  }

  @Test
  void createUserWithDuplicateEmailReturns409() {
    String body = createBody("duplicate", "viewer");
    given()
        .header("Authorization", admin)
        .contentType(ContentType.JSON)
        .body(body)
        .when()
        .post("/admin/users")
        .then()
        .statusCode(201);

    given()
        .header("Authorization", admin)
        .contentType(ContentType.JSON)
        .body(body)
        .when()
        .post("/admin/users")
        .then()
        .statusCode(409);
  }

  // --- GET /admin/users/:id ---

  @Test
  void getUserByIdReturnsDetails() {
    String id = createUser("detail", "viewer");

    given()
        .header("Authorization", admin)
        .when()
        .get("/admin/users/{id}", id)
        .then()
        .statusCode(200)
        .body("data.id", equalTo(id))
        .body("data.role", equalTo("viewer"));
  }

  @Test
  void getUnknownUserReturns404() {
    given()
        .header("Authorization", admin)
        .when()
        .get("/admin/users/{id}", UUID.randomUUID())
        .then()
        .statusCode(404)
        .body("error.message", equalTo("User not found"));
  }

  // --- PUT /admin/users/:id ---

  @Test
  void updateUserChangesNameRoleAndDivision() {
    String id = createUser("updatable", "viewer");
    String newEmail = "updated-" + UUID.randomUUID() + "@workload.local";

    given()
        .header("Authorization", admin)
        .contentType(ContentType.JSON)
        .body("{\"email\": \"" + newEmail + "\", \"name\": \"Renamed\", \"role\": \"editor\"}")
        .when()
        .put("/admin/users/{id}", id)
        .then()
        .statusCode(200)
        .body("data.name", equalTo("Renamed"))
        .body("data.role", equalTo("editor"))
        .body("data.email", equalTo(newEmail));
  }

  /** Epic §"Account Lockout": an admin unlocks a locked account through this endpoint. */
  @Test
  void updateWithUnlockClearsAccountLockout() {
    String id = createUser("locked", "viewer");
    User locked = lockAccount(id);

    given()
        .header("Authorization", admin)
        .contentType(ContentType.JSON)
        .body(
            "{\"email\": \""
                + locked.getEmail()
                + "\", \"name\": \"Unlocked\", \"role\": \"viewer\", \"unlock\": true}")
        .when()
        .put("/admin/users/{id}", id)
        .then()
        .statusCode(200)
        .body("data.lockedUntil", equalTo(null));

    User reloaded = userRepository.findById(UUID.fromString(id)).orElseThrow();
    assertThat(reloaded.getLockedUntil()).isNull();
    assertThat(reloaded.getFailedLoginCount()).isZero();
  }

  /** Editing a locked account is not an unlock — the admin has to ask for it. */
  @Test
  void updateWithoutUnlockKeepsAccountLocked() {
    String id = createUser("still-locked", "viewer");
    User locked = lockAccount(id);

    given()
        .header("Authorization", admin)
        .contentType(ContentType.JSON)
        .body(
            "{\"email\": \""
                + locked.getEmail()
                + "\", \"name\": \"Renamed While Locked\", \"role\": \"viewer\"}")
        .when()
        .put("/admin/users/{id}", id)
        .then()
        .statusCode(200)
        .body("data.name", equalTo("Renamed While Locked"))
        .body("data.lockedUntil", notNullValue());

    User reloaded = userRepository.findById(UUID.fromString(id)).orElseThrow();
    assertThat(reloaded.getLockedUntil()).isNotNull();
    assertThat(reloaded.getFailedLoginCount()).isEqualTo(5);
  }

  @Test
  void updateCannotPromoteUserToEngineer() {
    String id = createUser("no-promotion", "viewer");

    given()
        .header("Authorization", admin)
        .contentType(ContentType.JSON)
        .body("{\"email\": \"p@workload.local\", \"name\": \"P\", \"role\": \"engineer\"}")
        .when()
        .put("/admin/users/{id}", id)
        .then()
        .statusCode(422)
        .body(
            "error.message", equalTo("Engineer accounts cannot be created through this endpoint"));
  }

  @Test
  void updateUnknownUserReturns404() {
    given()
        .header("Authorization", admin)
        .contentType(ContentType.JSON)
        .body("{\"email\": \"x@workload.local\", \"name\": \"X\", \"role\": \"viewer\"}")
        .when()
        .put("/admin/users/{id}", UUID.randomUUID())
        .then()
        .statusCode(404);
  }

  // --- PUT /admin/users/:id/activate ---

  @Test
  void activateEnablesPlaceholderAccount() {
    String email = "activate-" + UUID.randomUUID() + "@workload.local";
    String id =
        given()
            .header("Authorization", admin)
            .contentType(ContentType.JSON)
            .body("{\"email\": \"" + email + "\", \"name\": \"Placeholder\", \"role\": \"viewer\"}")
            .when()
            .post("/admin/users")
            .then()
            .statusCode(201)
            .extract()
            .path("data.id");

    given()
        .header("Authorization", admin)
        .when()
        .put("/admin/users/{id}/activate", id)
        .then()
        .statusCode(200)
        .body("data.active", equalTo(true))
        .body("data.requiresActivation", equalTo(false));
  }

  // --- Engineer status is independent of the permission role ---

  /**
   * A team lead who still services objects needs editor rights and must stay an engineer: role is
   * the permission tier, {@code is_engineer} is the job function.
   */
  @Test
  void engineerPromotedToEditorStaysAnEngineer() {
    String engineerId = createEngineer();
    String email = engineerEmail(engineerId);

    given()
        .header("Authorization", admin)
        .contentType(ContentType.JSON)
        .body("{\"email\": \"" + email + "\", \"name\": \"Team Lead\", \"role\": \"editor\"}")
        .when()
        .put("/admin/users/{id}", engineerId)
        .then()
        .statusCode(200)
        .body("data.role", equalTo("editor"))
        .body("data.engineer", equalTo(true));

    // Still listed as an engineer, still reachable on the engineer detail route.
    given()
        .header("Authorization", admin)
        .when()
        .get("/engineers")
        .then()
        .statusCode(200)
        .body("data.findAll { it.id == '" + engineerId + "' }", hasSize(1));

    given()
        .header("Authorization", admin)
        .when()
        .get("/engineers/{id}", engineerId)
        .then()
        .statusCode(200)
        .body("data.role", equalTo("editor"));

    // …and still assignable to objects.
    given()
        .header("Authorization", admin)
        .contentType(ContentType.JSON)
        .body("{\"engineerId\": \"" + engineerId + "\"}")
        .when()
        .post("/objects/{id}/engineers", createObject())
        .then()
        .statusCode(201);
  }

  /** The engineer permission tier is only meaningful for someone who actually is an engineer. */
  @Test
  void nonEngineerCannotBeGivenTheEngineerRole() {
    String id = createUser("not-an-engineer", "viewer");

    given()
        .header("Authorization", admin)
        .contentType(ContentType.JSON)
        .body("{\"email\": \"n@workload.local\", \"name\": \"N\", \"role\": \"engineer\"}")
        .when()
        .put("/admin/users/{id}", id)
        .then()
        .statusCode(422);
  }

  /** Demotion is safe now: the flag outlives the role change, so assignments keep their owner. */
  @Test
  void engineerDemotedFromEditorBackToEngineerRole() {
    String engineerId = createEngineer();
    String email = engineerEmail(engineerId);

    given()
        .header("Authorization", admin)
        .contentType(ContentType.JSON)
        .body("{\"email\": \"" + email + "\", \"name\": \"Lead\", \"role\": \"editor\"}")
        .when()
        .put("/admin/users/{id}", engineerId)
        .then()
        .statusCode(200);

    given()
        .header("Authorization", admin)
        .contentType(ContentType.JSON)
        .body("{\"email\": \"" + email + "\", \"name\": \"Lead\", \"role\": \"engineer\"}")
        .when()
        .put("/admin/users/{id}", engineerId)
        .then()
        .statusCode(200)
        .body("data.role", equalTo("engineer"))
        .body("data.engineer", equalTo(true));
  }

  // --- PUT /admin/users/:id/password ---

  /**
   * The gap this endpoint closes: a placeholder account has no usable credential, so activation
   * alone leaves it unloggable. Create → activate → set password → log in must work end to end.
   */
  @Test
  void placeholderCanLogInAfterPasswordIsSet() {
    String email = "claimed-" + UUID.randomUUID() + "@workload.local";
    String id =
        given()
            .header("Authorization", admin)
            .contentType(ContentType.JSON)
            .body("{\"email\": \"" + email + "\", \"name\": \"Claimed\", \"role\": \"viewer\"}")
            .when()
            .post("/admin/users")
            .then()
            .statusCode(201)
            .extract()
            .path("data.id");

    given()
        .header("Authorization", admin)
        .when()
        .put("/admin/users/{id}/activate", id)
        .then()
        .statusCode(200);

    given()
        .header("Authorization", admin)
        .contentType(ContentType.JSON)
        .body("{\"password\": \"issued-password\"}")
        .when()
        .put("/admin/users/{id}/password", id)
        .then()
        .statusCode(204);

    given()
        .contentType(ContentType.JSON)
        .body("{\"email\": \"" + email + "\", \"password\": \"issued-password\"}")
        .when()
        .post("/auth/login")
        .then()
        .statusCode(200)
        .body("data.token", notNullValue());
  }

  @Test
  void setPasswordReleasesLockout() {
    String id = createUser("reset-locked", "viewer");
    User locked = lockAccount(id);

    given()
        .header("Authorization", admin)
        .contentType(ContentType.JSON)
        .body("{\"password\": \"brand-new-password\"}")
        .when()
        .put("/admin/users/{id}/password", id)
        .then()
        .statusCode(204);

    User reloaded = userRepository.findById(UUID.fromString(id)).orElseThrow();
    assertThat(reloaded.getLockedUntil()).isNull();
    assertThat(reloaded.getFailedLoginCount()).isZero();

    given()
        .contentType(ContentType.JSON)
        .body("{\"email\": \"" + locked.getEmail() + "\", \"password\": \"brand-new-password\"}")
        .when()
        .post("/auth/login")
        .then()
        .statusCode(200);
  }

  @Test
  void setPasswordRejectsShortPassword() {
    String id = createUser("short-password", "viewer");

    given()
        .header("Authorization", admin)
        .contentType(ContentType.JSON)
        .body("{\"password\": \"short\"}")
        .when()
        .put("/admin/users/{id}/password", id)
        .then()
        .statusCode(422)
        .body("error.code", equalTo(422));
  }

  @Test
  void viewerCannotSetAnotherUsersPassword() {
    String id = createUser("password-target", "viewer");
    String viewer = authenticationTestHelper.loginAs(Role.VIEWER);

    given()
        .header("Authorization", viewer)
        .contentType(ContentType.JSON)
        .body("{\"password\": \"hijacked-password\"}")
        .when()
        .put("/admin/users/{id}/password", id)
        .then()
        .statusCode(403);
  }

  @Test
  void setPasswordForUnknownUserReturns404() {
    given()
        .header("Authorization", admin)
        .contentType(ContentType.JSON)
        .body("{\"password\": \"brand-new-password\"}")
        .when()
        .put("/admin/users/{id}/password", UUID.randomUUID())
        .then()
        .statusCode(404);
  }

  // --- DELETE /admin/users/:id ---

  @Test
  void deleteDeactivatesUser() {
    String id = createUser("deactivate", "viewer");

    given()
        .header("Authorization", admin)
        .when()
        .delete("/admin/users/{id}", id)
        .then()
        .statusCode(204);

    given()
        .header("Authorization", admin)
        .when()
        .get("/admin/users/{id}", id)
        .then()
        .statusCode(200)
        .body("data.active", equalTo(false));
  }

  @Test
  void deleteEngineerWithAssignmentsReturns409() {
    String engineerId = createEngineer();
    String objectId = createObject();
    given()
        .header("Authorization", admin)
        .contentType(ContentType.JSON)
        .body("{\"engineerId\": \"" + engineerId + "\"}")
        .when()
        .post("/objects/{id}/engineers", objectId)
        .then()
        .statusCode(201);

    given()
        .header("Authorization", admin)
        .when()
        .delete("/admin/users/{id}", engineerId)
        .then()
        .statusCode(409)
        .body("error.code", equalTo(409));
  }

  // --- helpers ---

  private String engineerEmail(String engineerId) {
    return userRepository.findById(UUID.fromString(engineerId)).orElseThrow().getEmail();
  }

  private User lockAccount(String id) {
    User user = userRepository.findById(UUID.fromString(id)).orElseThrow();
    user.setFailedLoginCount(5);
    user.setLockedUntil(OffsetDateTime.now().plusMinutes(30));
    return userRepository.save(user);
  }

  private String createBody(String prefix, String role) {
    return "{\"email\": \""
        + prefix
        + "-"
        + UUID.randomUUID()
        + "@workload.local\", \"name\": \"Test User\", \"role\": \""
        + role
        + "\", \"password\": \"password123\"}";
  }

  private String createUser(String prefix, String role) {
    return given()
        .header("Authorization", admin)
        .contentType(ContentType.JSON)
        .body(createBody(prefix, role))
        .when()
        .post("/admin/users")
        .then()
        .statusCode(201)
        .extract()
        .path("data.id");
  }

  private String createEngineer() {
    return given()
        .header("Authorization", admin)
        .contentType(ContentType.JSON)
        .body(
            "{\"email\": \"admin-eng-"
                + UUID.randomUUID()
                + "@workload.local\", \"name\": \"Assigned Engineer\","
                + " \"password\": \"password123\", \"capacityFte\": 1.0}")
        .when()
        .post("/engineers")
        .then()
        .statusCode(201)
        .extract()
        .path("data.id");
  }

  private String createObject() {
    String divisionId =
        given()
            .header("Authorization", admin)
            .contentType(ContentType.JSON)
            .body("{\"name\": \"AdminUsers Div " + UUID.randomUUID() + "\"}")
            .when()
            .post("/divisions")
            .then()
            .statusCode(201)
            .extract()
            .path("data.id");

    String branchId =
        given()
            .header("Authorization", admin)
            .contentType(ContentType.JSON)
            .body("{\"name\": \"AdminUsers Branch " + UUID.randomUUID() + "\"}")
            .when()
            .post("/divisions/{id}/branches", divisionId)
            .then()
            .statusCode(201)
            .extract()
            .path("data.id");

    return given()
        .header("Authorization", admin)
        .contentType(ContentType.JSON)
        .body("{\"branchId\": \"" + branchId + "\", \"name\": \"AdminUsers Object\"}")
        .when()
        .post("/objects")
        .then()
        .statusCode(201)
        .extract()
        .path("data.id");
  }
}
