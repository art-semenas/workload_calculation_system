# PoC M-01 Backend — Core CRUD Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement all backend work for PoC M-01: missing Liquibase migrations for `users`, JPA entities, repositories, DTOs, MapStruct mappers, Spring Security + JWT authentication, Bucket4j rate limiting, `GlobalExceptionHandler`, and CRUD/read endpoints required by the PoC M-01 core CRUD epic.

**Architecture:** Spring Boot 3.4.1 REST monolith with DTO-only controller boundaries, Spring Data JPA repositories, Liquibase-managed PostgreSQL schema, stateless JWT authentication, in-memory Bucket4j rate limiting, and RestAssured/Testcontainers integration tests. All endpoints are served under `/api/v1`; `/actuator/health` stays public.

**Tech Stack:**

- Backend: Java 21, Spring Boot 3.4.1, Maven, Spring Data JPA, Spring Security, jjwt 0.12.6, Liquibase, MapStruct 1.6.3, Lombok 1.18.36, Bucket4j 8.10.1, PostgreSQL 15, log4j2
- Testing: JUnit 5, Mockito, Spring Boot Test, Spring Security Test, Testcontainers, RestAssured
- Quality gates: Spotless, Jacoco, SpotBugs

---

## Source-Of-Truth Alignment

Before implementing any task below, use these rules whenever the documents disagree:

1. `docs/TOR_Workload_WebApp.md` is the primary business-rule source of truth.
2. `docs/impl/api-spec.md` is authoritative for REST base path, envelope shape, and endpoint semantics.
3. `docs/impl/db-schema.md` is authoritative for table/column names, data types, unique constraints, and cascade rules.
4. `docs/impl/epics/poc-m01-core-crud.md` is authoritative for PoC M-01 scope and acceptance criteria.
5. `docs/superpowers/implementation-plan.md` is the planning source, but shorthand wording in it does not override the four sources above.

**Implementation decisions required up front:**

- All controller mappings use `/api/v1` prefixes.
- `travel.round_trip_min` is derived from `one_way_time_min` and returned in the API response; it is not stored in the `travel` table.
- Do not add calculation-engine behavior or `summaries` writes in this plan. PoC M-02 owns calculation and summary persistence. A stub `GET /objects/:id/summary` endpoint returns 404 when no summary row exists.
- Do not add engineer-module endpoints or entities in this plan. PoC M-03 owns those. Note: the `users`, `object_engineers`, and `engineer_summaries` tables already exist in `v1.0.0-initial-schema.xml` — do NOT create duplicate migrations for them.
- Catalog write endpoints (POST/PUT/DELETE for devices, contexts, and repairs) ARE implemented per api-spec.md (Phase: PoC + MVP), but no management UI exists in PoC (S-03).
- Authentication is enforced; RBAC is not enforced in PoC (S-04).
- The object persistence model follows the current schema (`objects.name`, `objects.import_seq_no`) rather than inventing a new `address` column.
- Role values are stored as lowercase strings in the database (matching db-schema.md, poc-scope.md, and the `v1.0.0` migration default `'viewer'`). The Java `Role` enum uses `@JsonValue` and a JPA `@Converter` for lowercase mapping.
- The API envelope always includes all three top-level fields (`data`, `meta`, `error`) — null fields are NOT omitted. `@JsonInclude(NON_NULL)` is used only on `ApiMeta` and `ApiError` inner records.
- Pagination meta uses `per_page` (snake_case) to match the TOR §10 envelope specification.

---

## Task 0: Create feature branch

**Files:**

- No file changes in this task

- [ ] **Step 1: Check out the branch for this plan**

```bash
git checkout feature/implementation
git pull origin feature/implementation
git checkout -b feature/poc-m01-backend
```

Expected: Git switches to `feature/poc-m01-backend` with no merge conflicts.

- [ ] **Step 2: Verify working tree is clean enough to start the plan**

```bash
git status --short
```

Expected: no unexpected modified backend files that would interfere with M-01 backend work.

---

## Task 1: Verify baseline and Testcontainers preconditions

**Files:**

- No file changes in this task

- [ ] **Step 1: Start the Windows Docker proxy for Java Testcontainers**

```powershell
Start-Job { wsl bash -c "python3 '/mnt/c/Work/Study/Projects/workload_calculation_system/docker-proxy.py'" }
Start-Sleep -Seconds 4
$env:DOCKER_HOST = "tcp://[::1]:2375"
```

Expected: PowerShell starts the background WSL proxy job without errors.

- [ ] **Step 2: Verify the proxy is listening**

```powershell
netstat -an | Select-String "2375"
```

Expected output contains `LISTENING` on `[::1]:2375`.

- [ ] **Step 3: Run the existing backend baseline test before adding M-01 code**

```bash
cd backend
mvn test -Dtest=WorkloadApplicationTest
```

Expected: `BUILD SUCCESS` and the current baseline context-load test passes.

- [ ] **Step 4: Commit nothing in this task**

This is a verification gate only.

---

## Task 2: Add shared API contracts and integration-test base classes

**Files:**

- Create: `backend/src/main/java/com/workload/dto/ApiError.java`
- Create: `backend/src/main/java/com/workload/dto/ApiMeta.java`
- Create: `backend/src/main/java/com/workload/dto/ApiResponse.java`
- Create: `backend/src/main/java/com/workload/entity/SystemType.java`
- Create: `backend/src/main/java/com/workload/entity/Role.java`
- Create: `backend/src/main/java/com/workload/entity/RoleConverter.java`
- Create: `backend/src/test/java/com/workload/support/IntegrationTestBase.java`
- Create: `backend/src/test/java/com/workload/support/AuthenticationTestHelper.java`

- [ ] **Step 1: Write the failing test first for the response envelope**

Create `backend/src/test/java/com/workload/support/ApiResponseSerializationTest.java`:

```java
package com.workload.support;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.workload.dto.ApiError;
import com.workload.dto.ApiMeta;
import com.workload.dto.ApiResponse;
import java.util.Map;
import org.junit.jupiter.api.Test;

class ApiResponseSerializationTest {

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    void serializesSuccessEnvelope() throws Exception {
        ApiResponse<Map<String, String>> response =
                ApiResponse.success(Map.of("status", "ok"), new ApiMeta(1L, 1, 50));

        String json = objectMapper.writeValueAsString(response);

        assertThat(json).contains("\"data\"");
        assertThat(json).contains("\"meta\"");
        assertThat(json).contains("\"per_page\"");
        assertThat(json).contains("\"error\":null");
    }

    @Test
    void serializesErrorEnvelope() throws Exception {
        ApiResponse<Void> response = ApiResponse.error(new ApiError("TEST_ERROR", "failure", null));

        String json = objectMapper.writeValueAsString(response);

        assertThat(json).contains("\"data\":null");
        assertThat(json).contains("\"error\"");
        assertThat(json).contains("\"affected_count\"");
        assertThat(json).contains("TEST_ERROR");
    }
}
```

- [ ] **Step 2: Run the targeted test and confirm it fails because the DTOs do not exist yet**

```bash
cd backend
mvn test -Dtest=ApiResponseSerializationTest
```

Expected: compilation failure because `ApiResponse`, `ApiError`, and `ApiMeta` do not exist.

- [ ] **Step 3: Write the shared envelope DTOs and enums**

Create `backend/src/main/java/com/workload/dto/ApiError.java`:

```java
package com.workload.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record ApiError(
        String code,
        String message,
        @JsonProperty("affected_count") Integer affectedCount) {}
```

Create `backend/src/main/java/com/workload/dto/ApiMeta.java`:

```java
package com.workload.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record ApiMeta(Long total, Integer page, @JsonProperty("per_page") Integer perPage) {}
```

Create `backend/src/main/java/com/workload/dto/ApiResponse.java`:

> **Note:** `ApiResponse` must NOT use `@JsonInclude(NON_NULL)`. The api-spec envelope (TOR §10)
> requires `"error": null` on success responses and `"data": null` on error responses.
> Omitting null fields would break the envelope contract.

```java
package com.workload.dto;

public record ApiResponse<T>(T data, ApiMeta meta, ApiError error) {

    public static <T> ApiResponse<T> success(T data, ApiMeta meta) {
        return new ApiResponse<>(data, meta, null);
    }

    public static <T> ApiResponse<T> success(T data) {
        return new ApiResponse<>(data, null, null);
    }

    public static <T> ApiResponse<T> error(ApiError error) {
        return new ApiResponse<>(null, null, error);
    }
}
```

Create `backend/src/main/java/com/workload/entity/SystemType.java`:

```java
package com.workload.entity;

public enum SystemType {
    OS,
    PS,
    VIDEO
}
```

Create `backend/src/main/java/com/workload/entity/Role.java`:

> **Note:** Role values are stored as lowercase strings in the database (see db-schema.md,
> poc-scope.md, and the `v1.0.0-initial-schema.xml` default `'viewer'`). The enum uses
> `@JsonValue` to serialize/deserialize as lowercase and a `@Converter` to persist as lowercase.

```java
package com.workload.entity;

import com.fasterxml.jackson.annotation.JsonValue;

public enum Role {
    ADMIN("admin"),
    EDITOR("editor"),
    ENGINEER("engineer"),
    VIEWER("viewer");

    private final String value;

    Role(String value) {
        this.value = value;
    }

    @JsonValue
    public String getValue() {
        return value;
    }

    public static Role fromValue(String value) {
        for (Role role : values()) {
            if (role.value.equalsIgnoreCase(value)) {
                return role;
            }
        }
        throw new IllegalArgumentException("Unknown role: " + value);
    }
}
```

Create `backend/src/main/java/com/workload/entity/RoleConverter.java`:

```java
package com.workload.entity;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

@Converter(autoApply = true)
public class RoleConverter implements AttributeConverter<Role, String> {

    @Override
    public String convertToDatabaseColumn(Role role) {
        return role == null ? null : role.getValue();
    }

    @Override
    public Role convertToEntityAttribute(String value) {
        return value == null ? null : Role.fromValue(value);
    }
}
```

Create `backend/src/test/java/com/workload/support/IntegrationTestBase.java`:

```java
package com.workload.support;

import io.restassured.RestAssured;
import org.junit.jupiter.api.BeforeEach;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.test.context.ActiveProfiles;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
public abstract class IntegrationTestBase {

    @LocalServerPort
    protected int port;

    @Autowired
    protected AuthenticationTestHelper authenticationTestHelper;

    @BeforeEach
    void configureRestAssured() {
        RestAssured.baseURI = "http://localhost";
        RestAssured.port = port;
        RestAssured.basePath = "/api/v1";
    }
}
```

Create `backend/src/test/java/com/workload/support/AuthenticationTestHelper.java`:

```java
package com.workload.support;

import io.restassured.http.ContentType;
import org.springframework.stereotype.Component;

import static io.restassured.RestAssured.given;

@Component
public class AuthenticationTestHelper {

    private static final String ADMIN_EMAIL = "admin@workload.local";
    private static final String ADMIN_PASSWORD = "password";

    public String bearerToken(String jwt) {
        return "Bearer " + jwt;
    }

    /**
     * Logs in as the seeded admin user and returns the bearer token string
     * (including the "Bearer " prefix) for use in authenticated requests.
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
```

- [ ] **Step 4: Run the targeted test again**

```bash
cd backend
mvn test -Dtest=ApiResponseSerializationTest
```

Expected: `BUILD SUCCESS` and the serialization test passes.

- [ ] **Step 5: Commit**

```bash
git add backend/src/main/java/com/workload/dto/ backend/src/main/java/com/workload/entity/ backend/src/test/java/com/workload/support/ backend/src/test/java/com/workload/support/ApiResponseSerializationTest.java
git commit -m "feat: add shared API envelope contracts and test support"
```

---

## Task 3: Seed the PoC admin user

> **Note:** The `users` table already exists — it was created in `v1.0.0-initial-schema.xml`
> (changeset `v1.0.0-6`) along with `object_engineers` and `engineer_summaries`.
> Do NOT create a duplicate `CREATE TABLE users` migration. This task only adds a seed admin row.

**Files:**

- Update: `backend/src/main/resources/db/changelog/db.changelog-master.xml`
- Create: `backend/src/main/resources/db/changelog/changes/v1.0.2-seed-admin.xml`

- [ ] **Step 1: Write the failing migration test first**

Update `backend/src/test/java/com/workload/WorkloadApplicationTest.java` to add a JDBC assertion that the seeded admin row is present after startup.

Use this complete test content:

```java
package com.workload;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;

@SpringBootTest
@ActiveProfiles("test")
class WorkloadApplicationTest {

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Test
    void contextLoads() {}

    @Test
    void usersTableAndSeedAdminArePresent() {
        Integer tableCount =
                jdbcTemplate.queryForObject(
                        """
                        select count(*)
                        from information_schema.tables
                        where table_schema = 'public' and table_name = 'users'
                        """,
                        Integer.class);

        assertThat(tableCount).isEqualTo(1);

        // Role values are lowercase in the database (see db-schema.md)
        List<String> roles = jdbcTemplate.queryForList("select role from users", String.class);
        assertThat(roles).contains("admin");
    }
}
```

- [ ] **Step 2: Run the targeted test and confirm it fails because no admin user has been seeded yet**

```bash
cd backend
mvn test -Dtest=WorkloadApplicationTest
```

Expected: `contextLoads` passes (the `users` table already exists from `v1.0.0`), but `usersTableAndSeedAdminArePresent` fails because no admin row is present.

- [ ] **Step 3: Write the seed-admin changeset**

Create `backend/src/main/resources/db/changelog/changes/v1.0.2-seed-admin.xml`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<databaseChangeLog
    xmlns="http://www.liquibase.org/xml/ns/dbchangelog"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xsi:schemaLocation="http://www.liquibase.org/xml/ns/dbchangelog
      https://www.liquibase.org/xml/ns/dbchangelog/dbchangelog-4.20.xsd">

  <changeSet id="v1.0.2-1" author="copilot">
    <comment>Seed PoC admin user</comment>

    <!-- Role value is lowercase to match db-schema.md and v1.0.0 default ('viewer') -->
    <insert tableName="users">
      <column name="id" value="11111111-1111-1111-1111-111111111111"/>
      <column name="email" value="admin@workload.local"/>
      <column name="name" value="PoC Admin"/>
      <column name="password_hash" value="$2a$10$7EqJtq98hPqEX7fNZaFWoOHiD7R6vVQZ8nfdXbra.6A7BfrpsbR9C"/>
      <column name="role" value="admin"/>
      <column name="capacity_fte" valueNumeric="1.00"/>
      <column name="is_active" valueBoolean="true"/>
      <column name="requires_activation" valueBoolean="false"/>
      <column name="created_at" valueComputed="now()"/>
      <column name="updated_at" valueComputed="now()"/>
    </insert>

    <rollback>
      <delete tableName="users">
        <where>email = 'admin@workload.local'</where>
      </delete>
    </rollback>
  </changeSet>
</databaseChangeLog>
```

- [ ] **Step 4: Register the changeset in the master changelog**

Update `backend/src/main/resources/db/changelog/db.changelog-master.xml` to:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<databaseChangeLog
    xmlns="http://www.liquibase.org/xml/ns/dbchangelog"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xsi:schemaLocation="http://www.liquibase.org/xml/ns/dbchangelog
      https://www.liquibase.org/xml/ns/dbchangelog/dbchangelog-4.20.xsd">

  <include file="db/changelog/changes/v1.0.0-initial-schema.xml"/>
  <include file="db/changelog/changes/v1.0.1-seed-data.xml"/>
  <include file="db/changelog/changes/v1.0.2-seed-admin.xml"/>
</databaseChangeLog>
```

- [ ] **Step 5: Run the migration test again**

```bash
cd backend
mvn test -Dtest=WorkloadApplicationTest
```

Expected: `BUILD SUCCESS` and both `contextLoads` and `usersTableAndSeedAdminArePresent` pass.

- [ ] **Step 6: Commit**

```bash
git add backend/src/main/resources/db/changelog/ backend/src/test/java/com/workload/WorkloadApplicationTest.java
git commit -m "feat: seed PoC admin user"
```

---

## Task 4: Add JPA entities and repository-backed structure tests

**Files:**

- Create: `backend/src/main/java/com/workload/entity/Division.java`
- Create: `backend/src/main/java/com/workload/entity/Branch.java`
- Create: `backend/src/main/java/com/workload/entity/ObjectEntity.java`
- Create: `backend/src/main/java/com/workload/entity/DeviceType.java`
- Create: `backend/src/main/java/com/workload/entity/DeviceSystemContext.java`
- Create: `backend/src/main/java/com/workload/entity/ObjectDevice.java`
- Create: `backend/src/main/java/com/workload/entity/ObjectSystemAssignment.java`
- Create: `backend/src/main/java/com/workload/entity/RepairType.java`
- Create: `backend/src/main/java/com/workload/entity/ObjectRepair.java`
- Create: `backend/src/main/java/com/workload/entity/RecordsTask.java`
- Create: `backend/src/main/java/com/workload/entity/Travel.java`
- Create: `backend/src/main/java/com/workload/entity/User.java`
- Create: `backend/src/test/java/com/workload/entity/EntityStructureTest.java`

- [ ] **Step 1: Write the failing `@DataJpaTest` first**

Create `backend/src/test/java/com/workload/entity/EntityStructureTest.java`:

```java
package com.workload.entity;

import static org.assertj.core.api.Assertions.assertThat;

import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.test.context.ActiveProfiles;

@DataJpaTest
@ActiveProfiles("test")
class EntityStructureTest {

    @Autowired
    private EntityManager entityManager;

    @Test
    void managedEntitiesAreRegistered() {
        assertThat(entityManager.getMetamodel().entity(Division.class).getName()).isEqualTo("Division");
        assertThat(entityManager.getMetamodel().entity(Branch.class).getName()).isEqualTo("Branch");
        assertThat(entityManager.getMetamodel().entity(ObjectEntity.class).getName()).isEqualTo("ObjectEntity");
        assertThat(entityManager.getMetamodel().entity(DeviceType.class).getName()).isEqualTo("DeviceType");
        assertThat(entityManager.getMetamodel().entity(DeviceSystemContext.class).getName())
                .isEqualTo("DeviceSystemContext");
        assertThat(entityManager.getMetamodel().entity(ObjectDevice.class).getName()).isEqualTo("ObjectDevice");
        assertThat(entityManager.getMetamodel().entity(ObjectSystemAssignment.class).getName())
                .isEqualTo("ObjectSystemAssignment");
        assertThat(entityManager.getMetamodel().entity(RepairType.class).getName()).isEqualTo("RepairType");
        assertThat(entityManager.getMetamodel().entity(ObjectRepair.class).getName()).isEqualTo("ObjectRepair");
        assertThat(entityManager.getMetamodel().entity(RecordsTask.class).getName()).isEqualTo("RecordsTask");
        assertThat(entityManager.getMetamodel().entity(Travel.class).getName()).isEqualTo("Travel");
        assertThat(entityManager.getMetamodel().entity(User.class).getName()).isEqualTo("User");
    }
}
```

- [ ] **Step 2: Run the targeted test and confirm it fails because the entities do not exist yet**

```bash
cd backend
mvn test -Dtest=EntityStructureTest
```

Expected: compilation failure because the entity classes do not exist.

- [ ] **Step 3: Create all M-01 JPA entities**

Implement every entity so it matches `docs/impl/db-schema.md` exactly. Required rules:

- Use `@Entity` and `@Table` with exact table names.
- Use `UUID` ids with values supplied by the application layer or database rows loaded from Liquibase.
- Use `BigDecimal` for all decimal fields.
- Use `Integer` for integer count fields (`object_repairs.count`, `import_seq_no`).
- Use Lombok `@Getter`, `@Setter`, `@Builder`, `@NoArgsConstructor`, and `@AllArgsConstructor`.
- Use `created_at` and `updated_at` columns where they exist in the schema.
- Do not add any M-02 or M-03 tables or columns.

Create `backend/src/main/java/com/workload/entity/Division.java`:

```java
package com.workload.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "divisions")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Division {

    @Id
    private UUID id;

    @Column(nullable = false, unique = true)
    private String name;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;
}
```

Create `backend/src/main/java/com/workload/entity/Branch.java` with `division` as `@ManyToOne(optional = false)` and columns `id`, `name`, `created_at`, `updated_at`.

Create `backend/src/main/java/com/workload/entity/ObjectEntity.java` with `id`, `branch`, `name`, `import_seq_no`, `created_at`, `updated_at`.

Create `backend/src/main/java/com/workload/entity/DeviceType.java` with `id`, `name`, `description`, `created_at`, `updated_at`.

Create `backend/src/main/java/com/workload/entity/DeviceSystemContext.java` with `id`, `deviceType`, `systemType`, `r1_minutes`, `r2_minutes`, `created_at`, `updated_at`.

Create `backend/src/main/java/com/workload/entity/ObjectDevice.java` with `id`, `object`, `deviceType`, `quantityPhysical`, `updated_at`, and a table-level unique constraint on `(object_id, device_type_id)`.

Create `backend/src/main/java/com/workload/entity/ObjectSystemAssignment.java` with `id`, `object`, `deviceType`, `systemType`, `quantityMaintained`, `context`, `updated_at`, and a unique constraint on `(object_id, device_type_id, system_type)`.

Create `backend/src/main/java/com/workload/entity/RepairType.java` with `id`, `name`, `timeMinutes`, `created_at`, `updated_at`.

Create `backend/src/main/java/com/workload/entity/ObjectRepair.java` with `id`, `object`, `repairType`, `count`, `updated_at`, and a unique constraint on `(object_id, repair_type_id)`.

Create `backend/src/main/java/com/workload/entity/RecordsTask.java` with `id`, `object`, `accessRequests`, `monitoringRequests`, `footageRequests`, `backupControl`, `securityAdmin`, `updated_at`, and a unique constraint on `object_id`.

Create `backend/src/main/java/com/workload/entity/Travel.java` with `id`, `object`, `transportType`, `distanceKm`, `oneWayTimeMin`, `updated_at`, and a unique constraint on `object_id`.

Create `backend/src/main/java/com/workload/entity/User.java` with `id`, `email`, `name`, `passwordHash`, `role`, `divisionId`, `homeDivisionId`, `capacityFte`, `employeeId`, `isActive`, `requiresActivation`, `created_at`, `updated_at`.

- [ ] **Step 4: Run the structure test again**

```bash
cd backend
mvn test -Dtest=EntityStructureTest
```

Expected: `BUILD SUCCESS` and Hibernate registers all M-01 entities.

- [ ] **Step 5: Commit**

```bash
git add backend/src/main/java/com/workload/entity/ backend/src/test/java/com/workload/entity/EntityStructureTest.java
git commit -m "feat: add PoC M-01 JPA entities"
```

---

## Task 5: Add repositories and constraint-focused `@DataJpaTest` coverage

**Files:**

- Create: `backend/src/main/java/com/workload/repository/DivisionRepository.java`
- Create: `backend/src/main/java/com/workload/repository/BranchRepository.java`
- Create: `backend/src/main/java/com/workload/repository/ObjectRepository.java`
- Create: `backend/src/main/java/com/workload/repository/DeviceTypeRepository.java`
- Create: `backend/src/main/java/com/workload/repository/DeviceSystemContextRepository.java`
- Create: `backend/src/main/java/com/workload/repository/ObjectDeviceRepository.java`
- Create: `backend/src/main/java/com/workload/repository/ObjectSystemAssignmentRepository.java`
- Create: `backend/src/main/java/com/workload/repository/RepairTypeRepository.java`
- Create: `backend/src/main/java/com/workload/repository/ObjectRepairRepository.java`
- Create: `backend/src/main/java/com/workload/repository/RecordsTaskRepository.java`
- Create: `backend/src/main/java/com/workload/repository/TravelRepository.java`
- Create: `backend/src/main/java/com/workload/repository/UserRepository.java`
- Create: `backend/src/test/java/com/workload/repository/RepositoryConstraintTest.java`

- [ ] **Step 1: Write the failing repository test first**

Create `backend/src/test/java/com/workload/repository/RepositoryConstraintTest.java`:

```java
package com.workload.repository;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.workload.entity.Division;
import jakarta.persistence.EntityManager;
import java.time.OffsetDateTime;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.test.context.ActiveProfiles;

@DataJpaTest
@ActiveProfiles("test")
class RepositoryConstraintTest {

    @Autowired
    private DivisionRepository divisionRepository;

    @Autowired
    private EntityManager entityManager;

    @Test
    void findByNameReturnsSavedDivision() {
        Division division =
                Division.builder()
                        .id(UUID.randomUUID())
                        .name("Brest Division")
                        .createdAt(OffsetDateTime.now())
                        .updatedAt(OffsetDateTime.now())
                        .build();

        divisionRepository.saveAndFlush(division);

        assertThat(divisionRepository.findByName("Brest Division")).isPresent();
    }

    @Test
    void duplicateDivisionNameViolatesUniqueConstraint() {
        Division first =
                Division.builder()
                        .id(UUID.randomUUID())
                        .name("Unique Division")
                        .createdAt(OffsetDateTime.now())
                        .updatedAt(OffsetDateTime.now())
                        .build();

        Division second =
                Division.builder()
                        .id(UUID.randomUUID())
                        .name("Unique Division")
                        .createdAt(OffsetDateTime.now())
                        .updatedAt(OffsetDateTime.now())
                        .build();

        divisionRepository.saveAndFlush(first);

        assertThatThrownBy(() -> {
                    divisionRepository.saveAndFlush(second);
                    entityManager.flush();
                })
                .isInstanceOf(DataIntegrityViolationException.class);
    }
}
```

- [ ] **Step 2: Run the targeted test and confirm it fails because the repository does not exist yet**

```bash
cd backend
mvn test -Dtest=RepositoryConstraintTest
```

Expected: compilation failure because `DivisionRepository` does not exist.

- [ ] **Step 3: Create all required repositories**

Use `JpaRepository<Aggregate, UUID>` and add exactly these methods:

Create `backend/src/main/java/com/workload/repository/DivisionRepository.java`:

```java
package com.workload.repository;

import com.workload.entity.Division;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DivisionRepository extends JpaRepository<Division, UUID> {
    Optional<Division> findByName(String name);
}
```

Create `BranchRepository` with `findAllByDivisionId(UUID divisionId)`.

Create `ObjectRepository` with `findAllByBranchId(UUID branchId)` and `findAllByBranchDivisionId(UUID divisionId)`.

Create `DeviceTypeRepository` and `RepairTypeRepository` as plain repositories.

Create `DeviceSystemContextRepository` with `findAllByDeviceTypeId(UUID deviceTypeId)` and `findByDeviceTypeIdAndSystemType(UUID, SystemType)`.

Create `ObjectDeviceRepository` with `findByObjectIdAndDeviceTypeId(UUID, UUID)` and `deleteByObjectIdAndDeviceTypeId(UUID, UUID)`.

Create `ObjectSystemAssignmentRepository` with `findAllByObjectId(UUID)` and `findByObjectIdAndDeviceTypeIdAndSystemType(UUID, UUID, SystemType)`.

Create `ObjectRepairRepository` with `findAllByObjectId(UUID)` and `findByObjectIdAndRepairTypeId(UUID, UUID)`.

Create `RecordsTaskRepository` with `findByObjectId(UUID)`.

Create `TravelRepository` with `findByObjectId(UUID)`.

Create `UserRepository` with `findByEmail(String)` and `findAllByRoleAndIsActive(Role, boolean)`.

- [ ] **Step 4: Run the repository test again**

```bash
cd backend
mvn test -Dtest=RepositoryConstraintTest
```

Expected: `BUILD SUCCESS` and the first repository test passes.

- [ ] **Step 5: Expand `RepositoryConstraintTest` with the rest of the repository contract checks**

Add tests for:

- `BranchRepository.findAllByDivisionId`
- `ObjectRepository.findAllByBranchDivisionId`
- `ObjectDeviceRepository.findByObjectIdAndDeviceTypeId`
- `ObjectSystemAssignmentRepository.findByObjectIdAndDeviceTypeIdAndSystemType`
- `ObjectRepairRepository.findByObjectIdAndRepairTypeId`
- `RecordsTaskRepository.findByObjectId`
- `TravelRepository.findByObjectId`
- `UserRepository.findByEmail`

Run the file after each small addition.

- [ ] **Step 6: Commit**

```bash
git add backend/src/main/java/com/workload/repository/ backend/src/test/java/com/workload/repository/RepositoryConstraintTest.java
git commit -m "feat: add M-01 repositories with constraint tests"
```

---

## Task 6: Add DTOs and MapStruct mappers

**Files:**

- Create all request/response DTOs under `backend/src/main/java/com/workload/dto/`
- Create mapper interfaces under `backend/src/main/java/com/workload/mapper/`
- Create mapper tests under `backend/src/test/java/com/workload/mapper/`

- [ ] **Step 1: Write failing mapper tests first**

Create `backend/src/test/java/com/workload/mapper/DivisionMapperTest.java`:

```java
package com.workload.mapper;

import static org.assertj.core.api.Assertions.assertThat;

import com.workload.dto.DivisionDto;
import com.workload.entity.Division;
import java.time.OffsetDateTime;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.mapstruct.factory.Mappers;

class DivisionMapperTest {

    private final DivisionMapper mapper = Mappers.getMapper(DivisionMapper.class);

    @Test
    void mapsDivisionToDto() {
        Division division =
                Division.builder()
                        .id(UUID.fromString("11111111-1111-1111-1111-111111111111"))
                        .name("Brest Division")
                        .createdAt(OffsetDateTime.parse("2026-03-30T10:15:30+00:00"))
                        .updatedAt(OffsetDateTime.parse("2026-03-30T10:15:30+00:00"))
                        .build();

        DivisionDto dto = mapper.toDto(division, 2L, 5L);

        assertThat(dto.id()).isEqualTo(division.getId());
        assertThat(dto.name()).isEqualTo("Brest Division");
        assertThat(dto.branchCount()).isEqualTo(2L);
        assertThat(dto.objectCount()).isEqualTo(5L);
    }
}
```

- [ ] **Step 2: Run the targeted test and confirm it fails because the DTO and mapper do not exist yet**

```bash
cd backend
mvn test -Dtest=DivisionMapperTest
```

Expected: compilation failure because `DivisionDto` and `DivisionMapper` do not exist.

- [ ] **Step 3: Create the DTOs**

Add these DTOs as Java records:

- `DivisionDto(UUID id, String name, Long branchCount, Long objectCount, OffsetDateTime createdAt, OffsetDateTime updatedAt)`
- `DivisionCreateRequest(@NotBlank String name)`
- `DivisionUpdateRequest(@NotBlank String name)`
- `BranchDto(UUID id, UUID divisionId, String name, Long objectCount, OffsetDateTime createdAt, OffsetDateTime updatedAt)`
- `BranchCreateRequest(@NotBlank String name)`
- `BranchUpdateRequest(@NotBlank String name)`
- `ObjectDto(UUID id, UUID branchId, UUID divisionId, String name, Integer importSeqNo, OffsetDateTime createdAt, OffsetDateTime updatedAt)`
- `ObjectCreateRequest(@NotNull UUID branchId, @NotBlank String name, Integer importSeqNo)`
- `ObjectUpdateRequest(@NotBlank String name, Integer importSeqNo)`
- `ObjectDeviceDto(UUID id, UUID objectId, UUID deviceTypeId, String deviceTypeName, BigDecimal quantityPhysical)`
- `ObjectDeviceUpsertRequest(@NotNull UUID deviceTypeId, @NotNull @DecimalMin("0.00") BigDecimal quantityPhysical)`
- `AssignmentDto(UUID id, UUID objectId, UUID deviceTypeId, String deviceTypeName, SystemType systemType, BigDecimal quantityMaintained, UUID contextId)`
- `AssignmentCreateRequest(@NotNull UUID deviceTypeId, @NotNull SystemType systemType, @NotNull @DecimalMin("0.00") BigDecimal quantityMaintained)`
- `AssignmentUpdateRequest(@NotNull @DecimalMin("0.00") BigDecimal quantityMaintained)`
- `RecordsDto(UUID id, UUID objectId, BigDecimal accessRequests, BigDecimal monitoringRequests, BigDecimal footageRequests, BigDecimal backupControl, BigDecimal securityAdmin)`
- `RecordsUpdateRequest(BigDecimal accessRequests, BigDecimal monitoringRequests, BigDecimal footageRequests, BigDecimal backupControl, BigDecimal securityAdmin)`
- `RepairTypeDto(UUID id, String name, BigDecimal timeMinutes)`
- `RepairDto(UUID id, UUID objectId, UUID repairTypeId, String repairTypeName, Integer count)`
- `RepairUpdateRequest(@NotNull @Min(0) Integer count)`
- `TravelDto(UUID id, UUID objectId, String transportType, BigDecimal distanceKm, BigDecimal oneWayTimeMin, BigDecimal roundTripMin)`
- `TravelUpdateRequest(String transportType, @NotNull @DecimalMin("0.00") BigDecimal distanceKm, @NotNull @DecimalMin("0.00") BigDecimal oneWayTimeMin)`
- `DeviceSystemContextDto(UUID id, UUID deviceTypeId, SystemType systemType, BigDecimal r1Minutes, BigDecimal r2Minutes)`
- `DeviceTypeDto(UUID id, String name, String description, java.util.List<DeviceSystemContextDto> contexts)`
- `UserDto(UUID id, String email, String name, Role role, UUID divisionId, UUID homeDivisionId, BigDecimal capacityFte, String employeeId, boolean isActive, boolean requiresActivation)`
- `LoginRequest(@Email @NotBlank String email, @NotBlank String password)`
- `LoginResponse(String token, UserDto user)`

- [ ] **Step 4: Create the MapStruct mappers**

Create mapper interfaces with `@Mapper(componentModel = "spring")`:

- `DivisionMapper`
- `BranchMapper`
- `ObjectMapper`
- `EquipmentMapper`
- `CatalogMapper`
- `UserMapper`

Rules:

- Use explicit `@Mapping` annotations whenever names differ.
- Compute `TravelDto.roundTripMin` in the mapper using `oneWayTimeMin.multiply(BigDecimal.valueOf(2))`.
- Do not map password hashes into any response DTO.

- [ ] **Step 5: Run the mapper test again**

```bash
cd backend
mvn test -Dtest=DivisionMapperTest
```

Expected: `BUILD SUCCESS` and the mapper test passes.

- [ ] **Step 6: Add and run mapper tests for `ObjectMapper`, `EquipmentMapper`, `CatalogMapper`, and `UserMapper`**

Each test should instantiate the mapper with `Mappers.getMapper(...)` and assert the exact DTO field values.

- [ ] **Step 7: Commit**

```bash
git add backend/src/main/java/com/workload/dto/ backend/src/main/java/com/workload/mapper/ backend/src/test/java/com/workload/mapper/
git commit -m "feat: add DTOs and MapStruct mappers for M-01"
```

---

## Task 7: Add authentication infrastructure and `/api/v1/auth` endpoints

**Files:**

- Create: `backend/src/main/java/com/workload/security/JwtTokenProvider.java`
- Create: `backend/src/main/java/com/workload/security/JwtAuthenticationFilter.java`
- Create: `backend/src/main/java/com/workload/service/UserDetailsServiceImpl.java`
- Update: `backend/src/main/java/com/workload/config/SecurityConfig.java`
- Create: `backend/src/main/java/com/workload/controller/AuthController.java`
- Create: `backend/src/test/java/com/workload/controller/AuthControllerIT.java`

- [ ] **Step 1: Write the failing integration test first**

Create `backend/src/test/java/com/workload/controller/AuthControllerIT.java`:

```java
package com.workload.controller;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.notNullValue;

import com.workload.support.IntegrationTestBase;
import io.restassured.http.ContentType;
import org.junit.jupiter.api.Test;

class AuthControllerIT extends IntegrationTestBase {

    @Test
    void loginWithValidCredentialsReturnsToken() {
        given()
                .contentType(ContentType.JSON)
                .body("""
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
                .body("error", org.hamcrest.Matchers.nullValue());
    }
}
```

- [ ] **Step 2: Run the targeted test and confirm it fails because the auth stack does not exist yet**

```bash
cd backend
mvn test -Dtest=AuthControllerIT
```

Expected: failure because `/api/v1/auth/login` is not mapped yet.

- [ ] **Step 3: Implement `JwtTokenProvider`**

Create `backend/src/main/java/com/workload/security/JwtTokenProvider.java` with:

- constructor-injected `@Value("${jwt.secret}") String secret`
- constructor-injected `@Value("${jwt.expiration-ms}") long expirationMs`
- `String generateToken(User user)`
- `String getEmail(String token)`
- `boolean isValidToken(String token)`

Use `Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8))` and `Jwts.builder()` from `jjwt` 0.12.6.

- [ ] **Step 4: Implement `UserDetailsServiceImpl`**

Load users by email from `UserRepository`. Reject inactive users. Map roles to `ROLE_<NAME>` authorities.

- [ ] **Step 5: Implement `JwtAuthenticationFilter`**

Rules:

- Extend `OncePerRequestFilter`.
- Read `Authorization: Bearer <token>`.
- Validate the token.
- Load the user via `UserDetailsServiceImpl`.
- Set `SecurityContextHolder`.

- [ ] **Step 6: Update `SecurityConfig`**

Replace the current config so that:

- `/api/v1/auth/**` and `/actuator/health` are permitted.
- all other `/api/v1/**` requests are authenticated.
- JWT filter is added before `UsernamePasswordAuthenticationFilter`.
- session creation stays stateless.
- CSRF, HTTP basic, and form login stay disabled.

Use this final method signature:

```java
@Bean
SecurityFilterChain securityFilterChain(HttpSecurity http, JwtAuthenticationFilter jwtAuthenticationFilter)
        throws Exception {
```

- [ ] **Step 7: Implement `AuthController`**

Required endpoints:

- `POST /api/v1/auth/login`
- `POST /api/v1/auth/logout` returns `204 No Content`
- `GET /api/v1/auth/me`

Login rules:

- accept `LoginRequest`
- authenticate with `AuthenticationManager` or manual `PasswordEncoder.matches`
- return `ApiResponse<LoginResponse>`
- on invalid credentials, throw a custom exception that maps to `INVALID_CREDENTIALS`

- [ ] **Step 8: Run the targeted integration test again**

```bash
cd backend
mvn test -Dtest=AuthControllerIT
```

Expected: `BUILD SUCCESS` and the login test passes.

- [ ] **Step 9: Expand `AuthControllerIT` with the rest of the auth contract**

Add tests for:

- wrong password returns `401`
- unknown email returns `401`
- `GET /auth/me` without token returns `401`
- `GET /auth/me` with valid token returns `200`
- `POST /auth/logout` returns `204`

- [ ] **Step 10: Commit**

```bash
git add backend/src/main/java/com/workload/security/ backend/src/main/java/com/workload/service/UserDetailsServiceImpl.java backend/src/main/java/com/workload/config/SecurityConfig.java backend/src/main/java/com/workload/controller/AuthController.java backend/src/test/java/com/workload/controller/AuthControllerIT.java
git commit -m "feat: add JWT authentication endpoints and security filter chain"
```

---

## Task 8: Add per-IP Bucket4j rate limiting and global exception mapping

**Files:**

- Create: `backend/src/main/java/com/workload/config/RateLimitFilter.java`
- Update: `backend/src/main/java/com/workload/config/RateLimitConfig.java`
- Create: custom exceptions under `backend/src/main/java/com/workload/exception/`
- Update: `backend/src/main/java/com/workload/exception/GlobalExceptionHandler.java`
- Create: `backend/src/test/java/com/workload/config/RateLimitFilterTest.java`
- Create: `backend/src/test/java/com/workload/exception/GlobalExceptionHandlerTest.java`

- [ ] **Step 1: Write the failing filter test first**

Create `backend/src/test/java/com/workload/config/RateLimitFilterTest.java` with Mockito-based verification that the 101st request from the same IP returns a 429 JSON envelope.

- [ ] **Step 2: Run the targeted test and confirm it fails because `RateLimitFilter` does not exist yet**

```bash
cd backend
mvn test -Dtest=RateLimitFilterTest
```

Expected: compilation failure because the filter does not exist.

- [ ] **Step 3: Implement the rate-limiting filter**

Create `backend/src/main/java/com/workload/config/RateLimitFilter.java` with these rules:

- extend `OncePerRequestFilter`
- limit only `/api/v1/**`
- bucket key is `request.getRemoteAddr()`
- use `ConcurrentHashMap<String, Bucket>`
- default policy is 100 requests/minute (matches existing `RateLimitConfig`)
- on rejection, return HTTP 429 with `ApiResponse.error(new ApiError("RATE_LIMIT_EXCEEDED", "Too many requests", null))`

- [ ] **Step 4: Update `RateLimitConfig` so it produces a `Bandwidth` or helper factory rather than one global bucket**

Replace the current one-bucket bean with:

```java
@Bean
Bandwidth defaultRateLimitBandwidth() {
    return Bandwidth.builder().capacity(100).refillGreedy(100, Duration.ofMinutes(1)).build();
}
```

- [ ] **Step 5: Wire the rate-limit filter into `SecurityConfig`**

Add the filter before the JWT authentication filter.

- [ ] **Step 6: Write the failing exception-handler tests**

Create `backend/src/test/java/com/workload/exception/GlobalExceptionHandlerTest.java` and assert the exact status and error codes for:

- `EntityNotFoundException` -> `404`
- `DataIntegrityViolationException` -> `409 CONSTRAINT_VIOLATION`
- `DeviceNotInInventoryException` -> `422 DEVICE_NOT_IN_INVENTORY`
- `NoContextForSystemException` -> `422 NO_CONTEXT_FOR_SYSTEM`
- `RoundTripNotEditableException` -> `422 ROUND_TRIP_NOT_EDITABLE`
- `MethodArgumentNotValidException` -> `422 VALIDATION_ERROR`
- `AccessDeniedException` -> `403 ACCESS_DENIED`
- bad credentials exception -> `401 INVALID_CREDENTIALS`
- unhandled `RuntimeException` -> `500 INTERNAL_ERROR`

- [ ] **Step 7: Implement the custom exceptions and `GlobalExceptionHandler`**

Create these exception classes:

- `EntityNotFoundException`
- `DivisionNotFoundException`
- `BranchNotFoundException`
- `ObjectNotFoundException`
- `DeviceNotInInventoryException`
- `NoContextForSystemException`
- `RoundTripNotEditableException`
- `InvalidCredentialsException`

Map every exception to `ApiResponse<Void>` with the exact TOR error code.

- [ ] **Step 8: Run the targeted tests again**

```bash
cd backend
mvn test -Dtest=RateLimitFilterTest,GlobalExceptionHandlerTest
```

Expected: `BUILD SUCCESS` and both test classes pass.

- [ ] **Step 9: Commit**

```bash
git add backend/src/main/java/com/workload/config/RateLimitConfig.java backend/src/main/java/com/workload/config/RateLimitFilter.java backend/src/main/java/com/workload/exception/ backend/src/test/java/com/workload/config/RateLimitFilterTest.java backend/src/test/java/com/workload/exception/GlobalExceptionHandlerTest.java backend/src/main/java/com/workload/config/SecurityConfig.java
git commit -m "feat: add rate limiting and global exception handling"
```

---

## Task 9: Implement divisions and branches services/controllers

**Files:**

- Create: `backend/src/main/java/com/workload/service/DivisionService.java`
- Create: `backend/src/main/java/com/workload/service/BranchService.java`
- Create: `backend/src/main/java/com/workload/controller/DivisionController.java`
- Create: `backend/src/main/java/com/workload/controller/BranchController.java`
- Create: `backend/src/test/java/com/workload/service/DivisionServiceTest.java`
- Create: `backend/src/test/java/com/workload/service/BranchServiceTest.java`
- Create: `backend/src/test/java/com/workload/controller/DivisionControllerIT.java`

- [ ] **Step 1: Write the failing service tests first**

Create `DivisionServiceTest` and `BranchServiceTest` with Mockito. Required test cases:

- `findAll()` returns mapped DTOs with counts
- `findById()` throws `DivisionNotFoundException` when missing
- `create()` saves a new division
- `update()` renames a division
- `findBranches()` returns branch DTOs for a division
- `createBranch()` rejects unknown division
- `BranchService.findById()` throws `BranchNotFoundException`
- `BranchService.update()` renames the branch

- [ ] **Step 2: Run the targeted unit tests and confirm they fail because the services do not exist yet**

```bash
cd backend
mvn test -Dtest=DivisionServiceTest,BranchServiceTest
```

Expected: compilation failure because the services do not exist.

- [ ] **Step 3: Implement `DivisionService` and `BranchService`**

Rules:

- use repositories and mappers only
- raise domain-specific not-found exceptions
- translate duplicate-name failures through the global handler rather than swallowing them

- [ ] **Step 4: Write the failing controller integration test**

Create `DivisionControllerIT` covering:

- `GET /divisions`
- `POST /divisions`
- `GET /divisions/{id}`
- `PUT /divisions/{id}`
- `GET /divisions/{id}/branches`
- `POST /divisions/{id}/branches`
- `GET /branches/{id}`
- `PUT /branches/{id}`

Use authenticated requests with the seeded admin account.

- [ ] **Step 5: Implement `DivisionController` and `BranchController`**

Mappings:

- `@RequestMapping("/api/v1/divisions")`
- `@RequestMapping("/api/v1/branches")`

Return types:

- list endpoints return `ApiResponse<List<...>>`
- create endpoints return `201 Created`
- update/read endpoints return `200 OK`

- [ ] **Step 6: Run the division/branch test set**

```bash
cd backend
mvn test -Dtest=DivisionServiceTest,BranchServiceTest,DivisionControllerIT
```

Expected: `BUILD SUCCESS` and all division/branch tests pass.

- [ ] **Step 7: Commit**

```bash
git add backend/src/main/java/com/workload/service/DivisionService.java backend/src/main/java/com/workload/service/BranchService.java backend/src/main/java/com/workload/controller/DivisionController.java backend/src/main/java/com/workload/controller/BranchController.java backend/src/test/java/com/workload/service/DivisionServiceTest.java backend/src/test/java/com/workload/service/BranchServiceTest.java backend/src/test/java/com/workload/controller/DivisionControllerIT.java
git commit -m "feat: add division and branch CRUD endpoints"
```

---

## Task 10: Implement object CRUD service/controller

**Files:**

- Create: `backend/src/main/java/com/workload/service/ObjectService.java`
- Create: `backend/src/main/java/com/workload/controller/ObjectController.java`
- Create: `backend/src/test/java/com/workload/service/ObjectServiceTest.java`
- Create: `backend/src/test/java/com/workload/controller/ObjectControllerIT.java`

- [ ] **Step 1: Write the failing service test first**

Required `ObjectServiceTest` cases:

- `findAll(Optional.empty())` returns all objects
- `findAll(Optional.of(divisionId))` filters by division via branch join
- `findById()` throws `ObjectNotFoundException` when missing
- `create()` rejects unknown branch id
- `update()` replaces object metadata
- `delete()` deletes the object and relies on cascade rows in child tables

- [ ] **Step 2: Run the targeted unit test and confirm it fails because the service does not exist yet**

```bash
cd backend
mvn test -Dtest=ObjectServiceTest
```

Expected: compilation failure because `ObjectService` does not exist.

- [ ] **Step 3: Implement `ObjectService`**

Rules:

- validate `branchId` exists on create/update
- return DTOs via the mapper
- keep delete logic PoC-simple: delete the object, do not add calculation or engineer-summary side effects in this milestone

- [ ] **Step 4: Write the failing integration test for AC-24 and AC-25**

Create `ObjectControllerIT` to cover:

- create with valid branch returns `201`
- create with invalid branch returns `422`
- `GET /objects?division_id=...` returns only matching objects
- update changes the name and `import_seq_no`
- delete returns `204`
- `GET /objects/{id}` after delete returns `404`

- [ ] **Step 5: Implement `ObjectController`**

Map it under `@RequestMapping("/api/v1/objects")` and add:

- `GET /objects`
- `POST /objects`
- `GET /objects/{id}`
- `PUT /objects/{id}`
- `DELETE /objects/{id}`

- [ ] **Step 6: Run the object test set**

```bash
cd backend
mvn test -Dtest=ObjectServiceTest,ObjectControllerIT
```

Expected: `BUILD SUCCESS` and the object tests pass.

- [ ] **Step 7: Commit**

```bash
git add backend/src/main/java/com/workload/service/ObjectService.java backend/src/main/java/com/workload/controller/ObjectController.java backend/src/test/java/com/workload/service/ObjectServiceTest.java backend/src/test/java/com/workload/controller/ObjectControllerIT.java
git commit -m "feat: add object CRUD endpoints"
```

---

## Task 11: Implement equipment inventory and assignment endpoints

**Files:**

- Create: `backend/src/main/java/com/workload/service/EquipmentService.java`
- Create: `backend/src/main/java/com/workload/controller/EquipmentController.java`
- Create: `backend/src/test/java/com/workload/service/EquipmentServiceTest.java`
- Create: `backend/src/test/java/com/workload/controller/EquipmentControllerIT.java`

- [ ] **Step 1: Write the failing service tests first**

`EquipmentServiceTest` must cover:

- listing physical devices for an object
- adding a physical device
- updating a physical device quantity
- deleting a physical device
- listing assignments
- rejecting assignment when the device is not in `object_devices` with `DEVICE_NOT_IN_INVENTORY`
- rejecting assignment when no `(device_type_id, system_type)` context exists with `NO_CONTEXT_FOR_SYSTEM`
- creating a valid assignment
- updating maintained quantity
- deleting an assignment

- [ ] **Step 2: Run the targeted unit test and confirm it fails because the service does not exist yet**

```bash
cd backend
mvn test -Dtest=EquipmentServiceTest
```

Expected: compilation failure because `EquipmentService` does not exist.

- [ ] **Step 3: Implement `EquipmentService`**

Rules:

- `addDevice()` and `updateDevice()` operate on `object_devices`
- `addAssignment()` verifies inventory presence first, then context presence
- use `DeviceSystemContextRepository.findByDeviceTypeIdAndSystemType(...)`
- use `ObjectSystemAssignmentRepository.findByObjectIdAndDeviceTypeIdAndSystemType(...)` to prevent duplicates
- return DTOs mapped through `EquipmentMapper`

- [ ] **Step 4: Write the failing integration test for AC-05, AC-11, AC-12, and AC-13**

Create `EquipmentControllerIT` and cover:

- `GET /objects/{id}/devices`
- `POST /objects/{id}/devices`
- `PUT /objects/{id}/devices/{dtid}`
- `DELETE /objects/{id}/devices/{dtid}`
- `GET /objects/{id}/assignments`
- `POST /objects/{id}/assignments`
- `PUT /objects/{id}/assignments/{aid}`
- `DELETE /objects/{id}/assignments/{aid}`

Use seeded catalog data from `v1.0.1-seed-data.xml` to create valid and invalid contexts.

- [ ] **Step 5: Implement `EquipmentController`**

Map equipment endpoints under `@RequestMapping("/api/v1/objects/{objectId}")`.

- [ ] **Step 6: Run the equipment test set**

```bash
cd backend
mvn test -Dtest=EquipmentServiceTest,EquipmentControllerIT
```

Expected: `BUILD SUCCESS` and the equipment tests pass.

- [ ] **Step 7: Commit**

```bash
git add backend/src/main/java/com/workload/service/EquipmentService.java backend/src/main/java/com/workload/controller/EquipmentController.java backend/src/test/java/com/workload/service/EquipmentServiceTest.java backend/src/test/java/com/workload/controller/EquipmentControllerIT.java
git commit -m "feat: add equipment inventory and assignment endpoints"
```

---

## Task 12: Implement records, repairs, and travel endpoints

**Files:**

- Create: `backend/src/main/java/com/workload/service/RecordsService.java`
- Create: `backend/src/main/java/com/workload/service/RepairService.java`
- Create: `backend/src/main/java/com/workload/service/TravelService.java`
- Create: `backend/src/main/java/com/workload/controller/RecordsController.java`
- Create: `backend/src/main/java/com/workload/controller/RepairController.java`
- Create: `backend/src/main/java/com/workload/controller/TravelController.java`
- Create: `backend/src/test/java/com/workload/service/RecordsServiceTest.java`
- Create: `backend/src/test/java/com/workload/service/RepairServiceTest.java`
- Create: `backend/src/test/java/com/workload/service/TravelServiceTest.java`
- Create: `backend/src/test/java/com/workload/controller/RecordsControllerIT.java`
- Create: `backend/src/test/java/com/workload/controller/RepairControllerIT.java`
- Create: `backend/src/test/java/com/workload/controller/TravelControllerIT.java`

- [ ] **Step 1: Write the failing service tests first**

Required unit-test cases:

- `RecordsService.get()` returns empty/default DTO when no row exists yet
- `RecordsService.update()` performs upsert
- `RepairService.getAll()` returns all repairs for the object
- `RepairService.update()` performs upsert by `(object_id, repair_type_id)` and rejects negative counts
- `TravelService.get()` returns current travel data plus computed `roundTripMin`
- `TravelService.update()` performs upsert
- `TravelService.update()` rejects direct round-trip edits by throwing `RoundTripNotEditableException`

- [ ] **Step 2: Run the targeted unit tests and confirm they fail because the services do not exist yet**

```bash
cd backend
mvn test -Dtest=RecordsServiceTest,RepairServiceTest,TravelServiceTest
```

Expected: compilation failure because the services do not exist.

- [ ] **Step 3: Implement the services**

Rules:

- `RecordsService` upserts one row per object
- `RepairService` upserts one row per `(object, repairType)`
- `TravelService` stores `transport_type`, `distance_km`, and `one_way_time_min`; it computes `roundTripMin` in the DTO
- no summary recalculation logic is added in this milestone

- [ ] **Step 4: Write the failing integration tests**

Required controller coverage:

- `GET /objects/{id}/records`
- `PUT /objects/{id}/records`
- `GET /objects/{id}/repairs`
- `PUT /objects/{id}/repairs/{rtid}`
- `GET /objects/{id}/travel`
- `PUT /objects/{id}/travel`

`TravelControllerIT` must explicitly verify AC-27:

- save `transport_type`, `distance_km`, `one_way_time_min`
- response includes `round_trip_min = one_way_time_min * 2`
- request that contains `round_trip_min` is rejected with `422 ROUND_TRIP_NOT_EDITABLE`

- [ ] **Step 5: Implement the three controllers**

Controllers must return `ApiResponse<...>` envelopes for all `GET` and `PUT` endpoints.

- [ ] **Step 6: Run the records/repairs/travel test set**

```bash
cd backend
mvn test -Dtest=RecordsServiceTest,RepairServiceTest,TravelServiceTest,RecordsControllerIT,RepairControllerIT,TravelControllerIT
```

Expected: `BUILD SUCCESS` and all tests pass.

- [ ] **Step 7: Commit**

```bash
git add backend/src/main/java/com/workload/service/RecordsService.java backend/src/main/java/com/workload/service/RepairService.java backend/src/main/java/com/workload/service/TravelService.java backend/src/main/java/com/workload/controller/RecordsController.java backend/src/main/java/com/workload/controller/RepairController.java backend/src/main/java/com/workload/controller/TravelController.java backend/src/test/java/com/workload/service/RecordsServiceTest.java backend/src/test/java/com/workload/service/RepairServiceTest.java backend/src/test/java/com/workload/service/TravelServiceTest.java backend/src/test/java/com/workload/controller/RecordsControllerIT.java backend/src/test/java/com/workload/controller/RepairControllerIT.java backend/src/test/java/com/workload/controller/TravelControllerIT.java
git commit -m "feat: add records repairs and travel endpoints"
```

---

## Task 13: Implement read-only catalog endpoints

**Files:**

- Create: `backend/src/main/java/com/workload/controller/CatalogController.java`
- Create: `backend/src/main/java/com/workload/service/CatalogService.java`
- Create: `backend/src/test/java/com/workload/controller/CatalogControllerIT.java`

- [ ] **Step 1: Write the failing integration test first**

Create `CatalogControllerIT` covering:

- `GET /catalog/devices`
- `GET /catalog/devices/{id}`
- `GET /catalog/devices/{id}/contexts`
- `GET /catalog/repairs`

Use seeded data from `v1.0.1` and assert the responses are not empty.

- [ ] **Step 2: Run the targeted test and confirm it fails because the controller does not exist yet**

```bash
cd backend
mvn test -Dtest=CatalogControllerIT
```

Expected: failure because the catalog routes are not mapped yet.

- [ ] **Step 3: Implement `CatalogService` and `CatalogController`**

Rules:

- device-type reads include nested contexts
- catalog write endpoints (POST/PUT/DELETE for devices, contexts, and repairs) ARE implemented per api-spec.md (Phase: PoC + MVP) — though no management UI exists in PoC (S-03), the API endpoints must be callable
- `DELETE /catalog/devices/:id` → blocked with 409 `DEVICE_IN_USE` if any `object_devices` rows reference the type
- `DELETE /catalog/devices/:id/contexts/:cid` → blocked with 409 `CONTEXT_IN_USE` if any `object_system_assignments` reference that context (AC-06)
- `DELETE /catalog/repairs/:id` → blocked with 409 `REPAIR_TYPE_IN_USE` if any `object_repairs` row references it with `count > 0`
- all routes are authenticated, but not role-restricted in PoC (S-04)

Endpoints:

- `GET /catalog/devices` → `List<DeviceTypeDto>`
- `POST /catalog/devices` → `DeviceTypeDto` (HTTP 201)
- `GET /catalog/devices/{id}` → `DeviceTypeDto` (with contexts)
- `PUT /catalog/devices/{id}` → `DeviceTypeDto`
- `DELETE /catalog/devices/{id}` → HTTP 204
- `GET /catalog/devices/{id}/contexts` → `List<DeviceSystemContextDto>`
- `POST /catalog/devices/{id}/contexts` → `DeviceSystemContextDto` (HTTP 201)
- `PUT /catalog/devices/{id}/contexts/{cid}` → `DeviceSystemContextDto`
- `DELETE /catalog/devices/{id}/contexts/{cid}` → HTTP 204
- `GET /catalog/repairs` → `List<RepairTypeDto>`
- `POST /catalog/repairs` → `RepairTypeDto` (HTTP 201)
- `PUT /catalog/repairs/{id}` → `RepairTypeDto`
- `DELETE /catalog/repairs/{id}` → HTTP 204

- [ ] **Step 4: Run the catalog test again**

```bash
cd backend
mvn test -Dtest=CatalogControllerIT
```

Expected: `BUILD SUCCESS` and all catalog endpoints pass (reads + writes + 409 blocked cases).

- [ ] **Step 5: Commit**

```bash
git add backend/src/main/java/com/workload/service/CatalogService.java backend/src/main/java/com/workload/controller/CatalogController.java backend/src/test/java/com/workload/controller/CatalogControllerIT.java
git commit -m "feat: add catalog read and write endpoints"
```

---

## Task 14: Add `GET /objects/:id/summary` stub endpoint

> **Note:** The epic lists `GET /objects/:id/summary` as a required endpoint. Meaningful
> calculation results are produced only after M-02 (calculation engine), but the endpoint
> must exist so the frontend can call it without errors.

**Files:**

- Update: `backend/src/main/java/com/workload/controller/ObjectController.java` (or a dedicated `SummaryController`)
- Create: `backend/src/main/java/com/workload/dto/SummaryDto.java`
- Update: `backend/src/test/java/com/workload/controller/ObjectControllerIT.java`

- [ ] **Step 1: Write the failing integration test first**

Add a test to `ObjectControllerIT`:

```java
@Test
void getObjectSummaryReturns404WhenNoSummaryExists() {
    // Create an object first, then request its summary
    // Without M-02 calculation, there is no summaries row
    given()
            .header("Authorization", authenticationTestHelper.loginAsAdmin())
            .when()
            .get("/objects/{id}/summary", testObjectId)
            .then()
            .statusCode(404)
            .body("error.code", equalTo("SUMMARY_NOT_FOUND"));
}
```

- [ ] **Step 2: Implement the stub endpoint**

Add to `ObjectController`:

```java
@GetMapping("/{id}/summary")
public ResponseEntity<ApiResponse<SummaryDto>> getObjectSummary(@PathVariable UUID id) {
    SummaryDto summary = objectService.getSummary(id);
    return ResponseEntity.ok(ApiResponse.success(summary));
}
```

`ObjectService.getSummary(UUID objectId)` queries the `summaries` table. If no row exists, throws `SummaryNotFoundException` which maps to 404 `SUMMARY_NOT_FOUND`.

`SummaryDto` contains all PoC-scope summary fields as `BigDecimal` (matches db-schema.md `summaries` table).

- [ ] **Step 3: Run the integration test**

```bash
cd backend
mvn test -Dtest=ObjectControllerIT
```

Expected: `BUILD SUCCESS` and the summary stub test passes.

- [ ] **Step 4: Commit**

```bash
git add backend/src/main/java/com/workload/controller/ObjectController.java backend/src/main/java/com/workload/dto/SummaryDto.java backend/src/test/java/com/workload/controller/ObjectControllerIT.java
git commit -m "feat: add GET /objects/:id/summary stub endpoint"
```

---

## Task 15: Run full backend quality gates

**Files:**

- No intended file changes, except fixes required by failing tests or static analysis

- [ ] **Step 1: Auto-format backend sources**

```bash
cd backend
mvn spotless:apply
```

Expected: formatting completes without error.

- [ ] **Step 2: Run the full backend verification suite**

```bash
cd backend
mvn verify
```

Expected: `BUILD SUCCESS`; unit tests, integration tests, Jacoco, Spotless check, and SpotBugs all pass.

- [ ] **Step 3: Fix any failures one category at a time**

If `mvn verify` fails:

- run the exact failing test class first
- fix the smallest cause
- rerun the targeted test
- rerun `mvn verify`

- [ ] **Step 4: Commit any gate-driven fixes**

```bash
git add backend
git commit -m "fix: satisfy backend quality gates for PoC M-01"
```

Only create this commit if Step 3 required source changes.

---

## Task 15.2: Add backend CI workflow

**Files:**

- Create: `.github/workflows/backend-ci.yml`

Implements TOR §20.2 steps 1–8 (backend-only; frontend steps are added when the frontend milestone is complete). Triggered on every push and pull request targeting `main` or `develop`. No Docker build on PRs — keeps feedback fast.

- [ ] **Step 1: Create the GitHub Actions workflow file**

Create `.github/workflows/backend-ci.yml`:

```yaml
name: Backend CI

on:
  push:
    branches: [main, develop, "feature/**"]
  pull_request:
    branches: [main, develop]

jobs:
  build:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_DB: workload_test
          POSTGRES_USER: workload
          POSTGRES_PASSWORD: workload
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Set up Java 21 (Temurin)
        uses: actions/setup-java@v4
        with:
          distribution: temurin
          java-version: "21"
          cache: maven

      - name: Compile
        working-directory: backend
        run: mvn -B compile

      - name: Run full verification (unit tests, integration tests, Jacoco, SpotBugs, Spotless)
        working-directory: backend
        env:
          SPRING_DATASOURCE_URL: jdbc:postgresql://localhost:5432/workload_test
          SPRING_DATASOURCE_USERNAME: workload
          SPRING_DATASOURCE_PASSWORD: workload
        run: mvn -B verify

      - name: Upload Jacoco coverage report
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: jacoco-report
          path: backend/target/site/jacoco/
```

- [ ] **Step 2: Commit the workflow**

```bash
git add .github/workflows/backend-ci.yml
git commit -m "chore: add backend CI workflow for quality gates (TOR §20.2)"
```

Expected: one new file committed; `git status` shows clean working tree.

---

## Task 16: Push the branch

**Files:**

- No file changes in this task

- [ ] **Step 1: Review the final backend diff**

```bash
git status
git log --oneline --decorate -5
```

Expected: working tree is clean and the M-01 backend commits are present on the current branch.

- [ ] **Step 2: Push the branch**

```bash
git push -u origin feature/poc-m01-backend
```

Expected: branch is published to origin and set as the upstream branch.

- [ ] **Step 3: Verify CI run passes**

```bash
gh run list --branch feature/poc-m01-backend --limit 1
```

Wait for the run to complete, then confirm status is `completed` / `success`:

```bash
gh run watch
```

Expected: the `Backend CI` workflow run completes with all steps green. If it fails, fix the root cause before opening a PR.

---

## Final Scope Checklist

- [ ] All implemented controller routes are under `/api/v1`
- [ ] `/actuator/health` remains public
- [ ] JWT authentication works for the seeded admin user
- [ ] Bucket4j rate limiting returns `429 RATE_LIMIT_EXCEEDED`
- [ ] Global exception mapping returns the standard API envelope (null fields are present, not omitted)
- [ ] Division, branch, object, equipment, records, repairs, travel, and catalog (read + write) endpoints are implemented
- [ ] Catalog write endpoints return 409 when referenced entities are in use (AC-06)
- [ ] `GET /objects/:id/summary` returns 404 when no summary exists (stub for M-02)
- [ ] No calculation-engine or summary-persistence logic was added
- [ ] No engineer-module code was added (entities/repos/services for `object_engineers` and `engineer_summaries` deferred to M-03)
- [ ] Role values are stored as lowercase in the database
- [ ] `mvn verify` passes in `backend`

## References

- `docs/impl/epics/poc-m01-core-crud.md`
- `docs/impl/api-spec.md`
- `docs/impl/db-schema.md`
- `docs/impl/poc-scope.md`
- `docs/impl/testcontainers-setup.md`
- `docs/TOR_Workload_WebApp.md`
