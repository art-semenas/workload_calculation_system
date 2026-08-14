package com.workload.controller;

import static io.restassured.RestAssured.given;
import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.greaterThan;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.not;

import com.workload.dto.AssignmentCreateRequest;
import com.workload.dto.ObjectDeviceUpsertRequest;
import com.workload.entity.DeviceSystemContext;
import com.workload.entity.DeviceType;
import com.workload.entity.Role;
import com.workload.entity.SystemType;
import com.workload.repository.DeviceSystemContextRepository;
import com.workload.repository.DeviceTypeRepository;
import com.workload.service.EquipmentService;
import com.workload.support.IntegrationTestBase;
import io.restassured.http.ContentType;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

/**
 * TOR §12: an engineer sees only the objects they are assigned to — "They cannot view other
 * engineers' rows, dashboards, or unassigned objects."
 *
 * <p>Most of these rules are <em>filters returning 200 with fewer rows</em>, not denials, so the
 * assertions here are on row counts and membership. A status-code-only assertion passes while the
 * filter is entirely absent, which is how this was missed the first time.
 */
class EngineerReadScopingIT extends IntegrationTestBase {

  @Autowired private DeviceTypeRepository deviceTypeRepository;
  @Autowired private DeviceSystemContextRepository deviceSystemContextRepository;
  @Autowired private EquipmentService equipmentService;

  private String admin;
  private String viewer;
  private String engineer;
  private String otherEngineer;

  private UUID engineerId;
  private UUID otherEngineerId;
  private String otherEngineerEmail;
  private UUID assignedObject;
  private UUID foreignObject;
  private UUID divisionId;

  @BeforeEach
  void setUpScopedFixtures() {
    admin = authenticationTestHelper.loginAsAdmin();
    viewer = authenticationTestHelper.loginAs(Role.VIEWER);

    divisionId = createDivision();
    UUID branchId = createBranch(divisionId);
    assignedObject = createObjectWithSummary(branchId, "Scoped Assigned");
    foreignObject = createObjectWithSummary(branchId, "Scoped Foreign");

    String engineerEmail = "scope-eng-" + UUID.randomUUID() + "@workload.local";
    engineerId = createEngineer(engineerEmail);
    engineer = authenticationTestHelper.login(engineerEmail, "password123");

    otherEngineerEmail = "scope-other-" + UUID.randomUUID() + "@workload.local";
    otherEngineerId = createEngineer(otherEngineerEmail);
    otherEngineer = authenticationTestHelper.login(otherEngineerEmail, "password123");

    assign(assignedObject, engineerId);
    assign(foreignObject, otherEngineerId);
  }

  // --- GET /objects ---

  @Test
  void engineerListsOnlyAssignedObjects() {
    given()
        .header("Authorization", engineer)
        .when()
        .get("/objects")
        .then()
        .statusCode(200)
        .body("data", hasSize(1))
        .body("data[0].id", equalTo(assignedObject.toString()));
  }

  @Test
  void otherRolesStillListEveryObject() {
    for (String token : new String[] {admin, viewer}) {
      given()
          .header("Authorization", token)
          .when()
          .get("/objects")
          .then()
          .statusCode(200)
          .body("data.id", hasItem(assignedObject.toString()))
          .body("data.id", hasItem(foreignObject.toString()));
    }
  }

  /** The division filter must not widen the engineer's scope. */
  @Test
  void engineerListFilteredByDivisionStaysScoped() {
    given()
        .header("Authorization", engineer)
        .queryParam("division_id", divisionId)
        .when()
        .get("/objects")
        .then()
        .statusCode(200)
        .body("data", hasSize(1))
        .body("data[0].id", equalTo(assignedObject.toString()));
  }

  // --- GET /objects/{id} and /summary ---

  @Test
  void engineerReadsOwnObjectDetail() {
    given()
        .header("Authorization", engineer)
        .when()
        .get("/objects/{id}", assignedObject)
        .then()
        .statusCode(200);
  }

  @Test
  void engineerCannotReadForeignObjectDetail() {
    given()
        .header("Authorization", engineer)
        .when()
        .get("/objects/{id}", foreignObject)
        .then()
        .statusCode(403)
        .body("error.code", equalTo(403));
  }

  @Test
  void engineerCannotReadForeignObjectSummary() {
    given()
        .header("Authorization", engineer)
        .when()
        .get("/objects/{id}/summary", foreignObject)
        .then()
        .statusCode(403);
  }

  @Test
  void engineerCannotReadForeignObjectEngineerList() {
    given()
        .header("Authorization", engineer)
        .when()
        .get("/objects/{id}/engineers", foreignObject)
        .then()
        .statusCode(403);
  }

  @Test
  void viewerStillReadsAnyObjectDetail() {
    given()
        .header("Authorization", viewer)
        .when()
        .get("/objects/{id}", foreignObject)
        .then()
        .statusCode(200);
  }

  // --- GET /svod ---

  @Test
  void engineerSeesOnlyOwnRowsInSvod() {
    given()
        .header("Authorization", engineer)
        .when()
        .get("/svod")
        .then()
        .statusCode(200)
        .body("data.content", hasSize(1))
        .body("data.content[0].objectId", equalTo(assignedObject.toString()))
        .body("data.totalElements", equalTo(1));
  }

  @Test
  void adminSeesMoreSvodRowsThanTheEngineer() {
    given()
        .header("Authorization", admin)
        .when()
        .get("/svod")
        .then()
        .statusCode(200)
        .body("data.totalElements", greaterThan(1))
        .body("data.content.objectId", not(hasItem(equalTo(null))));
  }

  // --- XLSX export ---

  @Test
  void engineerXlsxExportCarriesOnlyOwnRows() throws IOException {
    byte[] xlsx =
        given()
            .header("Authorization", engineer)
            .when()
            .get("/svod/export/xlsx")
            .then()
            .statusCode(200)
            .extract()
            .asByteArray();

    // The export must not become a way to read around the /svod filter.
    assertThat(dataRowCount(xlsx)).isEqualTo(1);
  }

  @Test
  void adminXlsxExportCarriesEveryRow() throws IOException {
    byte[] xlsx =
        given()
            .header("Authorization", admin)
            .when()
            .get("/svod/export/xlsx")
            .then()
            .statusCode(200)
            .extract()
            .asByteArray();

    assertThat(dataRowCount(xlsx)).isGreaterThan(1);
  }

  // --- Other engineers' dashboards ---

  @Test
  void engineerCannotReadAnotherEngineersObjects() {
    given()
        .header("Authorization", engineer)
        .when()
        .get("/engineers/{id}/objects", otherEngineerId)
        .then()
        .statusCode(403);
  }

  @Test
  void engineerCannotReadAnotherEngineersSummary() {
    given()
        .header("Authorization", engineer)
        .when()
        .get("/engineers/{id}/summary", otherEngineerId)
        .then()
        .statusCode(403);
  }

  @Test
  void engineerReadsOwnObjectsAndSummary() {
    given()
        .header("Authorization", engineer)
        .when()
        .get("/engineers/{id}/objects", engineerId)
        .then()
        .statusCode(200)
        .body("data", hasSize(1));

    given()
        .header("Authorization", engineer)
        .when()
        .get("/engineers/{id}/summary", engineerId)
        .then()
        .statusCode(200);
  }

  @Test
  void viewerStillReadsAnyEngineersDashboard() {
    given()
        .header("Authorization", viewer)
        .when()
        .get("/engineers/{id}/objects", otherEngineerId)
        .then()
        .statusCode(200);
  }

  // --- Management rollups ---

  @Test
  void engineerCannotReadAggregations() {
    String[] routes = {
      "/aggregations/company", "/aggregations/divisions", "/aggregations/branches", "/coverage/gaps"
    };
    for (String route : routes) {
      given().header("Authorization", engineer).when().get(route).then().statusCode(403);
    }
  }

  @Test
  void viewerStillReadsAggregations() {
    given()
        .header("Authorization", viewer)
        .when()
        .get("/aggregations/company")
        .then()
        .statusCode(200);
    given().header("Authorization", viewer).when().get("/coverage/gaps").then().statusCode(200);
  }

  /** An engineer holding the editor role is scoped by the role, not by the engineer flag. */
  @Test
  void engineerPromotedToEditorSeesEveryObject() {
    given()
        .header("Authorization", admin)
        .contentType(ContentType.JSON)
        // Keep the email: it is the JWT subject, so changing it would invalidate their token.
        .body(
            "{\"email\": \"" + otherEngineerEmail + "\", \"name\": \"Lead\", \"role\": \"editor\"}")
        .when()
        .put("/admin/users/{id}", otherEngineerId)
        .then()
        .statusCode(200);

    given()
        .header("Authorization", otherEngineer)
        .when()
        .get("/objects")
        .then()
        .statusCode(200)
        .body("data.id", hasItem(assignedObject.toString()));
  }

  // --- helpers ---

  private int dataRowCount(byte[] xlsx) throws IOException {
    try (XSSFWorkbook workbook = new XSSFWorkbook(new ByteArrayInputStream(xlsx))) {
      Sheet sheet = workbook.getSheetAt(0);
      return sheet.getLastRowNum(); // row 0 is the header
    }
  }

  private UUID createDivision() {
    return UUID.fromString(
        given()
            .header("Authorization", admin)
            .contentType(ContentType.JSON)
            .body("{\"name\": \"Scope Div " + UUID.randomUUID() + "\"}")
            .when()
            .post("/divisions")
            .then()
            .statusCode(201)
            .extract()
            .path("data.id"));
  }

  private UUID createBranch(UUID division) {
    return UUID.fromString(
        given()
            .header("Authorization", admin)
            .contentType(ContentType.JSON)
            .body("{\"name\": \"Scope Branch " + UUID.randomUUID() + "\"}")
            .when()
            .post("/divisions/{id}/branches", division)
            .then()
            .statusCode(201)
            .extract()
            .path("data.id"));
  }

  /** Equipment writes trigger the synchronous recalculation that produces the СВОД row. */
  private UUID createObjectWithSummary(UUID branchId, String name) {
    UUID objectId =
        UUID.fromString(
            given()
                .header("Authorization", admin)
                .contentType(ContentType.JSON)
                .body(
                    "{\"branchId\": \""
                        + branchId
                        + "\", \"name\": \""
                        + name
                        + " "
                        + UUID.randomUUID()
                        + "\"}")
                .when()
                .post("/objects")
                .then()
                .statusCode(201)
                .extract()
                .path("data.id"));

    DeviceType deviceType =
        deviceTypeRepository.saveAndFlush(
            DeviceType.builder()
                .id(UUID.randomUUID())
                .name("Scope-Device-" + UUID.randomUUID())
                .description("Read scoping fixture")
                .createdAt(OffsetDateTime.now())
                .updatedAt(OffsetDateTime.now())
                .build());
    deviceSystemContextRepository.saveAndFlush(
        DeviceSystemContext.builder()
            .id(UUID.randomUUID())
            .deviceType(deviceType)
            .systemType(SystemType.OS)
            .r1Minutes(new BigDecimal("10"))
            .r2Minutes(new BigDecimal("5"))
            .createdAt(OffsetDateTime.now())
            .updatedAt(OffsetDateTime.now())
            .build());

    equipmentService.upsertDevice(
        objectId, new ObjectDeviceUpsertRequest(deviceType.getId(), new BigDecimal("2")));
    equipmentService.addAssignment(
        objectId, new AssignmentCreateRequest(deviceType.getId(), SystemType.OS, BigDecimal.ONE));

    return objectId;
  }

  private UUID createEngineer(String email) {
    return UUID.fromString(
        given()
            .header("Authorization", admin)
            .contentType(ContentType.JSON)
            .body(
                "{\"email\": \""
                    + email
                    + "\", \"name\": \"Scoped Engineer\","
                    + " \"password\": \"password123\", \"capacityFte\": 1.0}")
            .when()
            .post("/engineers")
            .then()
            .statusCode(201)
            .extract()
            .path("data.id"));
  }

  private void assign(UUID objectId, UUID engineerUserId) {
    given()
        .header("Authorization", admin)
        .contentType(ContentType.JSON)
        .body("{\"engineerId\": \"" + engineerUserId + "\"}")
        .when()
        .post("/objects/{id}/engineers", objectId)
        .then()
        .statusCode(201);
  }
}
