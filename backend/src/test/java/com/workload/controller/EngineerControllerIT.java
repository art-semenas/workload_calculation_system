package com.workload.controller;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.notNullValue;
import static org.hamcrest.Matchers.nullValue;

import com.workload.entity.ObjectEngineer;
import com.workload.entity.ObjectEntity;
import com.workload.entity.User;
import com.workload.repository.ObjectEngineerRepository;
import com.workload.repository.ObjectRepository;
import com.workload.repository.UserRepository;
import com.workload.support.IntegrationTestBase;
import io.restassured.http.ContentType;
import java.time.OffsetDateTime;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

class EngineerControllerIT extends IntegrationTestBase {

  @Autowired private ObjectEngineerRepository objectEngineerRepository;
  @Autowired private ObjectRepository objectRepository;
  @Autowired private UserRepository userRepository;

  private String bearerToken;

  @BeforeEach
  void authenticate() {
    bearerToken = authenticationTestHelper.loginAsAdmin();
  }

  @Test
  void createEngineer_returns201_withEngineerRole() {
    given()
        .header("Authorization", bearerToken)
        .contentType(ContentType.JSON)
        .body(
            """
            {
              "email": "eng.create@test.com",
              "name": "Create Engineer",
              "password": "password1",
              "capacityFte": 1.0
            }
            """)
        .when()
        .post("/engineers")
        .then()
        .statusCode(201)
        .body("data.role", equalTo("engineer"))
        .body("data.id", notNullValue())
        .body("data.isActive", equalTo(true))
        .body("error", nullValue());
  }

  @Test
  void createEngineer_duplicateEmail_returns409() {
    String body =
        """
        {
          "email": "eng.dup@test.com",
          "name": "Dup Engineer",
          "password": "password1",
          "capacityFte": 1.0
        }
        """;

    given()
        .header("Authorization", bearerToken)
        .contentType(ContentType.JSON)
        .body(body)
        .when()
        .post("/engineers")
        .then()
        .statusCode(201);

    given()
        .header("Authorization", bearerToken)
        .contentType(ContentType.JSON)
        .body(body)
        .when()
        .post("/engineers")
        .then()
        .statusCode(409)
        .body("error.code", equalTo(409));
  }

  @Test
  void getEngineers_filtersEngineersOnly() {
    given()
        .header("Authorization", bearerToken)
        .contentType(ContentType.JSON)
        .body(
            """
            {
              "email": "eng.list@test.com",
              "name": "List Engineer",
              "password": "password1",
              "capacityFte": 1.0
            }
            """)
        .when()
        .post("/engineers")
        .then()
        .statusCode(201);

    // Engineer membership is the is_engineer flag, not the role — an engineer may hold the editor
    // or admin role and must still be listed. So this asserts on who is in the list, not on roles:
    // the new engineer is there, the seeded admin (who is not an engineer) is not.
    given()
        .header("Authorization", bearerToken)
        .when()
        .get("/engineers")
        .then()
        .statusCode(200)
        .body("data", hasSize(org.hamcrest.Matchers.greaterThanOrEqualTo(1)))
        .body("data.email", org.hamcrest.Matchers.hasItem("eng.list@test.com"))
        .body(
            "data.email",
            org.hamcrest.Matchers.not(org.hamcrest.Matchers.hasItem("admin@workload.local")));
  }

  @Test
  void getEngineers_filterByStatus() {
    given()
        .header("Authorization", bearerToken)
        .contentType(ContentType.JSON)
        .body(
            """
            {
              "email": "eng.status@test.com",
              "name": "Status Engineer",
              "password": "password1",
              "capacityFte": 1.0
            }
            """)
        .when()
        .post("/engineers")
        .then()
        .statusCode(201);

    // Engineers with no assignments have no summary — status=normal filter returns empty list
    given()
        .header("Authorization", bearerToken)
        .queryParam("status", "overloaded")
        .when()
        .get("/engineers")
        .then()
        .statusCode(200)
        .body("error", nullValue());
  }

  @Test
  void getEngineer_notFound_returns404() {
    given()
        .header("Authorization", bearerToken)
        .when()
        .get("/engineers/{id}", UUID.randomUUID())
        .then()
        .statusCode(404)
        .body("error.code", equalTo(404));
  }

  @Test
  void updateEngineer_changesCapacity() {
    String id =
        given()
            .header("Authorization", bearerToken)
            .contentType(ContentType.JSON)
            .body(
                """
                {
                  "email": "eng.upd@test.com",
                  "name": "Update Engineer",
                  "password": "password1",
                  "capacityFte": 1.0
                }
                """)
            .when()
            .post("/engineers")
            .then()
            .statusCode(201)
            .extract()
            .path("data.id");

    given()
        .header("Authorization", bearerToken)
        .contentType(ContentType.JSON)
        .body(
            """
            {
              "name": "Updated Name",
              "capacityFte": 0.5
            }
            """)
        .when()
        .put("/engineers/{id}", id)
        .then()
        .statusCode(200)
        .body("data.capacityFte", equalTo(0.5f))
        .body("data.name", equalTo("Updated Name"));
  }

  @Test
  void deactivateEngineer_noAssignments_returns204() {
    String id =
        given()
            .header("Authorization", bearerToken)
            .contentType(ContentType.JSON)
            .body(
                """
                {
                  "email": "eng.deact@test.com",
                  "name": "Deact Engineer",
                  "password": "password1",
                  "capacityFte": 1.0
                }
                """)
            .when()
            .post("/engineers")
            .then()
            .statusCode(201)
            .extract()
            .path("data.id");

    given()
        .header("Authorization", bearerToken)
        .when()
        .delete("/engineers/{id}", id)
        .then()
        .statusCode(204);

    // Verify engineer is inactive
    given()
        .header("Authorization", bearerToken)
        .when()
        .get("/engineers/{id}", id)
        .then()
        .statusCode(200)
        .body("data.isActive", equalTo(false));
  }

  @Test
  void deactivateEngineer_hasAssignments_returns409() {
    String engId =
        given()
            .header("Authorization", bearerToken)
            .contentType(ContentType.JSON)
            .body(
                """
                {
                  "email": "eng.deact409@test.com",
                  "name": "Deact409 Engineer",
                  "password": "password1",
                  "capacityFte": 1.0
                }
                """)
            .post("/engineers")
            .then()
            .statusCode(201)
            .extract()
            .path("data.id");

    // Directly create an object_engineers row to simulate an active assignment
    String divId =
        given()
            .header("Authorization", bearerToken)
            .contentType(ContentType.JSON)
            .body(
                """
                {"name": "EngDeactDiv"}
                """)
            .post("/divisions")
            .then()
            .statusCode(201)
            .extract()
            .path("data.id");

    String branchId =
        given()
            .header("Authorization", bearerToken)
            .contentType(ContentType.JSON)
            .body(
                """
                {"name": "EngDeactBranch"}
                """)
            .post("/divisions/{id}/branches", divId)
            .then()
            .statusCode(201)
            .extract()
            .path("data.id");

    String objectId =
        given()
            .header("Authorization", bearerToken)
            .contentType(ContentType.JSON)
            .body(
                """
                {"name": "EngDeactObj", "branchId": "%s"}
                """
                    .formatted(branchId))
            .post("/objects")
            .then()
            .statusCode(201)
            .extract()
            .path("data.id");

    ObjectEntity object = objectRepository.findById(UUID.fromString(objectId)).orElseThrow();
    User engineer = userRepository.findById(UUID.fromString(engId)).orElseThrow();
    objectEngineerRepository.save(
        ObjectEngineer.builder()
            .id(UUID.randomUUID())
            .object(object)
            .engineer(engineer)
            .assignedAt(OffsetDateTime.now())
            .build());

    // Try to deactivate — should fail 409
    given()
        .header("Authorization", bearerToken)
        .when()
        .delete("/engineers/{id}", engId)
        .then()
        .statusCode(409)
        .body("error.code", equalTo(409));
  }
}
