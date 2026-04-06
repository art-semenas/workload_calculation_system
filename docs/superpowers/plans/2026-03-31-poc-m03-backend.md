# PoC M-03 Backend — Engineer Module

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Engineer CRUD, object-engineer assignments, `engineer_summaries` calculation (each engineer's FTE share per assigned object, component breakdown, load_ratio, status), synchronous recalculation on all assignment and capacity changes. 14 endpoints from the engineer module.

**Branch:** `feature/poc-m03-backend`
**Depends on:** `feature/poc-m02-backend` merged to `feature/implementation`

**PoC Simplifications Active:**

- **S-02:** Synchronous recalculation — no `is_stale`, no background worker. Engineer summaries are recomputed immediately on every triggering event.
- **S-04:** Roles exist but no access restriction — all authenticated users can read/write all data. The `role` column is used for engineer identification only.
- **S-05:** No planning periods — no `period_id` FK.

---

## Reference Documents

| File                              | Purpose                                                     |
| --------------------------------- | ----------------------------------------------------------- |
| `docs/impl/calculation-engine.md` | §6.12–6.14: engineer workload split, status, invalidation   |
| `docs/impl/api-spec.md`          | Full API contract — engineer endpoints, error codes          |
| `docs/impl/db-schema.md`         | `object_engineers`, `engineer_summaries`, `users` schema     |
| `docs/impl/poc-scope.md`         | PoC simplifications S-02, S-04                               |
| `docs/TOR_Workload_WebApp.md`    | §4.10–4.11 (engineer module), §6.12–6.14, §7.4–7.7, §13    |
| `CONTRIBUTING.md`                | Mandatory test: `EngineerWorkloadServiceTest`                |

---

## Source-Of-Truth Alignment

1. `docs/TOR_Workload_WebApp.md` is the primary business-rule source of truth.
2. `docs/impl/api-spec.md` is authoritative for REST base path, envelope shape, error codes.
3. `docs/impl/db-schema.md` is authoritative for table/column names, constraints, cascade rules.
4. `docs/impl/calculation-engine.md` §6.12–6.14 is authoritative for engineer summary formulas.
5. `docs/superpowers/implementation-plan.md` Plan 5 is the planning source, but shorthand wording does not override the four sources above.

**Key constraints:**

- All controller mappings use `/api/v1` prefix.
- Both `object_engineers` and `engineer_summaries` tables already exist in `v1.0.0-initial-schema.xml` — **NO** new Liquibase migrations are needed.
- All arithmetic for engineer summaries uses `BigDecimal` — never `double` or `float`.
- All constants read from `WorkloadConfig` at call time — never cached at startup.
- DTOs only in controllers — no JPA entity exposure in API responses (AD-14).
- The overload boundary is always exactly `1.0` and is **not** configurable (TOR §6.13). `ENGINEER_WARNING_THRESHOLD` (default 0.9) is the only configurable threshold.
- Engineer status values are lowercase strings in the database: `'normal'`, `'warning'`, `'overloaded'`.
- `engineer_summaries.is_stale` column does **not** exist in PoC schema — added in M-06.
- `is_active` filtering in assignment dropdowns is **not** an RBAC feature (AD-18) — it must be implemented in PoC.

---

## File Structure (new files created by this plan)

```
backend/src/main/java/com/workload/
├── entity/
│   ├── ObjectEngineer.java
│   └── EngineerSummary.java
├── repository/
│   ├── ObjectEngineerRepository.java
│   └── EngineerSummaryRepository.java
├── service/
│   ├── EngineerService.java
│   ├── EngineerSummaryService.java
│   └── ObjectEngineerService.java
├── controller/
│   ├── EngineerController.java
│   └── ObjectEngineerController.java
├── dto/
│   ├── EngineerDto.java
│   ├── EngineerCreateRequest.java
│   ├── EngineerUpdateRequest.java
│   ├── EngineerSummaryDto.java
│   ├── EngineerShareDto.java
│   ├── EngineerObjectDto.java
│   └── ObjectEngineerAssignRequest.java
├── mapper/
│   ├── EngineerMapper.java
│   └── EngineerSummaryMapper.java
└── exception/
    └── EngineerHasActiveAssignmentsException.java

backend/src/test/java/com/workload/
├── entity/
│   └── ObjectEngineerEntityTest.java
├── repository/
│   ├── ObjectEngineerRepositoryTest.java
│   └── EngineerSummaryRepositoryTest.java
├── service/
│   ├── EngineerServiceTest.java
│   ├── EngineerWorkloadServiceTest.java
│   └── ObjectEngineerServiceTest.java
├── controller/
│   ├── EngineerControllerIT.java
│   └── ObjectEngineerControllerIT.java
└── service/
    └── EngineerRecalculationWiringIT.java
```

---

## Task 0: Create Feature Branch

- [ ] **Step 1: Create branch from feature/implementation**

```bash
git checkout feature/implementation
git pull origin feature/implementation
git checkout -b feature/poc-m03-backend
```

Expected: Git switches to `feature/poc-m03-backend` with no merge conflicts.

- [ ] **Step 2: Verify working tree is clean**

```bash
git status --short
```

Expected: no unexpected modified backend files.

---

## Task 1: JPA Entities and Repositories

> **Important:** Both `object_engineers` and `engineer_summaries` tables already exist in the
> `v1.0.0-initial-schema.xml` migration (changeset `v1.0.0-6`). This task creates JPA entities
> and Spring Data repositories — no Liquibase changes needed.

**Files:**

- Create: `backend/src/main/java/com/workload/entity/ObjectEngineer.java`
- Create: `backend/src/main/java/com/workload/entity/EngineerSummary.java`
- Create: `backend/src/main/java/com/workload/repository/ObjectEngineerRepository.java`
- Create: `backend/src/main/java/com/workload/repository/EngineerSummaryRepository.java`
- Create: `backend/src/test/java/com/workload/repository/ObjectEngineerRepositoryTest.java`
- Create: `backend/src/test/java/com/workload/repository/EngineerSummaryRepositoryTest.java`

### 1A: Write the failing test first

- [ ] **Step 1: Write ObjectEngineerRepositoryTest.java**

`@DataJpaTest` with Testcontainers. Test methods:

| Test method                              | What it verifies                                                                                   |
| ---------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `findAllByObjectId_returnsAssignments`   | Persist 2 assignments for same object, verify both found                                           |
| `findAllByEngineerId_returnsAssignments` | Persist assignments across 2 objects for same engineer, verify both found                          |
| `countByObjectId_returnsCorrectCount`    | Persist 3 assignments, assert `countByObjectId == 3`                                               |
| `uniqueConstraint_sameObjectAndEngineer` | Persist same (object_id, engineer_id) twice → `DataIntegrityViolationException`                    |
| `cascadeDeleteFromObject`                | Delete object → all `object_engineers` rows for that object are cascade-deleted                    |
| `restrictDeleteForEngineer`              | Attempt to delete a User who has `object_engineers` rows → blocked by FK `ON DELETE RESTRICT`      |

Test data setup: create Division → Branch → ObjectEntity for the object; create User with `role='engineer'` for the engineer. Use `TestEntityManager` to persist the entity chain.

- [ ] **Step 2: Write EngineerSummaryRepositoryTest.java**

`@DataJpaTest` with Testcontainers. Test methods:

| Test method                           | What it verifies                                                |
| ------------------------------------- | --------------------------------------------------------------- |
| `findByEngineerId_returnsSummary`     | Persist engineer summary, find by engineer ID                   |
| `uniqueConstraintOnEngineerId`        | Second summary for same engineer → `DataIntegrityViolationException` |
| `saveAndRetrieve_allFieldsPersist`    | All BigDecimal fields round-trip correctly                       |

- [ ] **Step 3: Run tests — expect FAIL (entities do not exist)**

```bash
cd backend && mvn test -Dtest="ObjectEngineerRepositoryTest,EngineerSummaryRepositoryTest" -q
```

Expected: compilation error — `ObjectEngineer` and `EngineerSummary` classes not found.

### 1B: Implement entities and repositories

- [ ] **Step 4: Create ObjectEngineer.java**

Entity requirements — must match `v1.0.0` schema exactly:

| Java field   | DB column     | Type            | Constraints                         |
| ------------ | ------------- | --------------- | ----------------------------------- |
| `id`         | `id`          | `UUID`          | PK, auto-generated                  |
| `object`     | `object_id`   | `@ManyToOne`    | `nullable=false`, FK → objects      |
| `engineer`   | `engineer_id` | `@ManyToOne`    | `nullable=false`, FK → users        |
| `assignedAt` | `assigned_at` | `Instant`       | `nullable=false`, default `now()`   |
| `assignedBy` | `assigned_by` | `UUID`          | nullable (who created the assignment) |

- `@Table(name = "object_engineers", uniqueConstraints = @UniqueConstraint(columnNames = {"object_id", "engineer_id"}))`
- Lombok: `@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor`
- The `engineer` FK must reference `User` entity — validate that `user.role == ENGINEER` at the service layer, not via DB constraint.

- [ ] **Step 5: Create EngineerSummary.java**

Entity requirements — must match `v1.0.0` schema exactly:

| Java field    | DB column       | Type            | Constraints                         |
| ------------- | --------------- | --------------- | ----------------------------------- |
| `id`          | `id`            | `UUID`          | PK, auto-generated                  |
| `engineer`    | `engineer_id`   | `@OneToOne`     | `nullable=false`, UNIQUE, FK → users |
| `totalLoad`   | `total_load`    | `BigDecimal`    |                                     |
| `objectCount` | `object_count`  | `Integer`       |                                     |
| `osLoad`      | `os_load`       | `BigDecimal`    |                                     |
| `psLoad`      | `ps_load`       | `BigDecimal`    |                                     |
| `videoLoad`   | `video_load`    | `BigDecimal`    |                                     |
| `recordsLoad` | `records_load`  | `BigDecimal`    |                                     |
| `repairLoad`  | `repair_load`   | `BigDecimal`    |                                     |
| `capacityFte` | `capacity_fte`  | `BigDecimal`    |                                     |
| `loadRatio`   | `load_ratio`    | `BigDecimal`    |                                     |
| `status`      | `status`        | `String`        | `'normal'`/`'warning'`/`'overloaded'` |
| `computedAt`  | `computed_at`   | `Instant`       |                                     |

- `@Table(name = "engineer_summaries")`
- Lombok: `@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor`
- **No** `is_stale` field — PoC exclusion (S-02, added in M-06)

- [ ] **Step 6: Create ObjectEngineerRepository.java**

```java
package com.workload.repository;

import com.workload.entity.ObjectEngineer;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ObjectEngineerRepository extends JpaRepository<ObjectEngineer, UUID> {
  List<ObjectEngineer> findAllByObjectId(UUID objectId);
  List<ObjectEngineer> findAllByEngineerId(UUID engineerId);
  Optional<ObjectEngineer> findByObjectIdAndEngineerId(UUID objectId, UUID engineerId);
  int countByObjectId(UUID objectId);
}
```

- [ ] **Step 7: Create EngineerSummaryRepository.java**

```java
package com.workload.repository;

import com.workload.entity.EngineerSummary;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface EngineerSummaryRepository extends JpaRepository<EngineerSummary, UUID> {
  Optional<EngineerSummary> findByEngineerId(UUID engineerId);
  void deleteByEngineerId(UUID engineerId);
}
```

- [ ] **Step 8: Run tests — expect PASS**

```bash
cd backend && mvn test -Dtest="ObjectEngineerRepositoryTest,EngineerSummaryRepositoryTest" -q
```

Expected: `BUILD SUCCESS`.

- [ ] **Step 9: Commit**

```bash
git add backend/src/main/java/com/workload/entity/ObjectEngineer.java \
        backend/src/main/java/com/workload/entity/EngineerSummary.java \
        backend/src/main/java/com/workload/repository/ObjectEngineerRepository.java \
        backend/src/main/java/com/workload/repository/EngineerSummaryRepository.java \
        backend/src/test/java/com/workload/repository/ObjectEngineerRepositoryTest.java \
        backend/src/test/java/com/workload/repository/EngineerSummaryRepositoryTest.java
git commit -m "feat: add ObjectEngineer and EngineerSummary entities with repository tests"
```

---

## Task 2: DTOs and MapStruct Mappers

**Files:**

- Create: `backend/src/main/java/com/workload/dto/EngineerDto.java`
- Create: `backend/src/main/java/com/workload/dto/EngineerCreateRequest.java`
- Create: `backend/src/main/java/com/workload/dto/EngineerUpdateRequest.java`
- Create: `backend/src/main/java/com/workload/dto/EngineerSummaryDto.java`
- Create: `backend/src/main/java/com/workload/dto/EngineerShareDto.java`
- Create: `backend/src/main/java/com/workload/dto/EngineerObjectDto.java`
- Create: `backend/src/main/java/com/workload/dto/ObjectEngineerAssignRequest.java`
- Create: `backend/src/main/java/com/workload/mapper/EngineerMapper.java`
- Create: `backend/src/main/java/com/workload/mapper/EngineerSummaryMapper.java`
- Create: `backend/src/test/java/com/workload/mapper/EngineerMapperTest.java`

### DTO Specifications

**EngineerDto** — response representation for an engineer:

| Field               | Type        | Source                         |
| ------------------- | ----------- | ------------------------------ |
| `id`                | UUID        | `users.id`                     |
| `email`             | String      | `users.email`                  |
| `name`              | String      | `users.name`                   |
| `role`              | String      | `users.role` (always `"engineer"`) |
| `homeDivisionId`    | UUID        | `users.home_division_id`       |
| `homeDivisionName`  | String      | `divisions.name` (via join)    |
| `capacityFte`       | BigDecimal  | `users.capacity_fte`           |
| `employeeId`        | String      | `users.employee_id`            |
| `isActive`          | boolean     | `users.is_active`              |
| `objectCount`       | Integer     | from `engineer_summaries.object_count` (nullable — null if no summary) |
| `totalLoad`         | BigDecimal  | from `engineer_summaries.total_load` (nullable) |
| `loadRatio`         | BigDecimal  | from `engineer_summaries.load_ratio` (nullable) |
| `status`            | String      | from `engineer_summaries.status` (nullable) |
| `createdAt`         | Instant     | `users.created_at`             |

**EngineerCreateRequest** — request body for `POST /engineers`:

| Field            | Type       | Validation                                 |
| ---------------- | ---------- | ------------------------------------------ |
| `email`          | String     | `@NotBlank`, `@Email`                      |
| `name`           | String     | `@NotBlank`                                |
| `password`       | String     | `@NotBlank`, `@Size(min=8)`                |
| `capacityFte`    | BigDecimal | `@NotNull`, `@DecimalMin("0.01")`          |
| `homeDivisionId` | UUID       | nullable                                   |
| `employeeId`     | String     | nullable                                   |

**EngineerUpdateRequest** — request body for `PUT /engineers/:id`:

| Field            | Type       | Validation                                 |
| ---------------- | ---------- | ------------------------------------------ |
| `name`           | String     | `@NotBlank`                                |
| `capacityFte`    | BigDecimal | `@NotNull`, `@DecimalMin("0.01")`          |
| `homeDivisionId` | UUID       | nullable                                   |
| `employeeId`     | String     | nullable                                   |

**EngineerSummaryDto** — full summary detail for `GET /engineers/:id/summary`:

| Field         | Type        | Source                              |
| ------------- | ----------- | ----------------------------------- |
| `engineerId`  | UUID        | `engineer_summaries.engineer_id`    |
| `totalLoad`   | BigDecimal  | `engineer_summaries.total_load`     |
| `objectCount` | Integer     | `engineer_summaries.object_count`   |
| `osLoad`      | BigDecimal  | `engineer_summaries.os_load`        |
| `psLoad`      | BigDecimal  | `engineer_summaries.ps_load`        |
| `videoLoad`   | BigDecimal  | `engineer_summaries.video_load`     |
| `recordsLoad` | BigDecimal  | `engineer_summaries.records_load`   |
| `repairLoad`  | BigDecimal  | `engineer_summaries.repair_load`    |
| `capacityFte` | BigDecimal  | `engineer_summaries.capacity_fte`   |
| `loadRatio`   | BigDecimal  | `engineer_summaries.load_ratio`     |
| `status`      | String      | `engineer_summaries.status`         |
| `computedAt`  | Instant     | `engineer_summaries.computed_at`    |

**EngineerShareDto** — per-engineer share at a specific object (for `GET /objects/:id/engineers`):

| Field          | Type       | Source                                            |
| -------------- | ---------- | ------------------------------------------------- |
| `engineerId`   | UUID       | `object_engineers.engineer_id`                    |
| `engineerName` | String     | `users.name`                                      |
| `objectShare`  | BigDecimal | `itogo_chislo_with_travel / engineer_count`        |
| `totalLoad`    | BigDecimal | `engineer_summaries.total_load` (engineer's total) |
| `loadRatio`    | BigDecimal | `engineer_summaries.load_ratio`                    |
| `status`       | String     | `engineer_summaries.status`                        |
| `assignedAt`   | Instant    | `object_engineers.assigned_at`                     |

**EngineerObjectDto** — per-object row for `GET /engineers/:id/objects`:

| Field                    | Type       | Source                                       |
| ------------------------ | ---------- | -------------------------------------------- |
| `objectId`               | UUID       | `objects.id`                                 |
| `objectName`             | String     | `objects.name`                               |
| `branchName`             | String     | `branches.name`                              |
| `divisionName`           | String     | `divisions.name`                             |
| `engineerShare`          | BigDecimal | `itogo_chislo_with_travel / engineer_count`   |
| `itogoChisloWithTravel`  | BigDecimal | `summaries.itogo_chislo_with_travel`          |
| `engineerCount`          | Integer    | `COUNT(object_engineers)` for this object     |
| `assignedAt`             | Instant    | `object_engineers.assigned_at`                |

**ObjectEngineerAssignRequest** — request body for `POST /objects/:id/engineers` and `POST /engineers/:id/objects`:

| Field        | Type | Validation                          |
| ------------ | ---- | ----------------------------------- |
| `engineerId` | UUID | `@NotNull` (for object-side assign) |
| `objectId`   | UUID | `@NotNull` (for engineer-side assign) |

### MapStruct Mappers

`EngineerMapper` — `@Mapper(componentModel = "spring")`:

- `User` entity → `EngineerDto` (with `@Mapping` for `homeDivisionName` from the division join, summary fields from `EngineerSummary`)
- `EngineerCreateRequest` → `User` (set `role = "engineer"`, hash password via injected `PasswordEncoder`)

`EngineerSummaryMapper` — `@Mapper(componentModel = "spring")`:

- `EngineerSummary` entity → `EngineerSummaryDto`

### TDD Cycle

- [ ] **Step 1: Write EngineerMapperTest.java**

Unit test (no Spring context needed) — instantiate mapper implementation directly. Verify:

- `toDto` maps all fields correctly including `homeDivisionName`
- `toEntity` from `EngineerCreateRequest` sets `role = "engineer"`, `isActive = true`, `requiresActivation = false`
- Null summary fields map to null in the DTO

- [ ] **Step 2: Run test — expect FAIL**

```bash
cd backend && mvn test -Dtest=EngineerMapperTest -q
```

- [ ] **Step 3: Implement all DTOs and mappers**

- [ ] **Step 4: Run test — expect PASS**

```bash
cd backend && mvn test -Dtest=EngineerMapperTest -q
```

- [ ] **Step 5: Commit**

```bash
git add backend/src/main/java/com/workload/dto/Engineer*.java \
        backend/src/main/java/com/workload/dto/ObjectEngineerAssignRequest.java \
        backend/src/main/java/com/workload/mapper/EngineerMapper.java \
        backend/src/main/java/com/workload/mapper/EngineerSummaryMapper.java \
        backend/src/test/java/com/workload/mapper/EngineerMapperTest.java
git commit -m "feat: add engineer DTOs and MapStruct mappers"
```

---

## Task 3: Engineer Summary Calculation Service — Tests First (Strict TDD)

This implements the formulas from `docs/impl/calculation-engine.md` §6.12–6.14. This is the highest-importance domain logic in M-03 and includes a mandatory test from CONTRIBUTING.md.

**Files:**

- Create: `backend/src/test/java/com/workload/service/EngineerWorkloadServiceTest.java`
- Create: `backend/src/main/java/com/workload/service/EngineerSummaryService.java`

### 3A: Write EngineerWorkloadServiceTest — ALL tests first

- [ ] **Step 1: Write EngineerWorkloadServiceTest.java**

Unit test using Mockito. Mock: `ObjectEngineerRepository`, `SummaryRepository`, `EngineerSummaryRepository`, `UserRepository`. Inject real `WorkloadConfig` (constructed manually with default values).

**Mandatory test cases (from CONTRIBUTING.md):**

| Test method                                    | What it verifies                                                                                                                                   |
| ---------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `singleEngineer_fullObjectLoad`                | 1 engineer assigned to 1 object with `itogo=0.032327` → `total_load = 0.032327`, `object_count = 1`                                                |
| `twoCoEngineers_equalSplit`                     | 2 engineers on same object → each gets `itogo / 2`, `object_count = 1`                                                                             |
| `threeCoEngineers_equalSplit`                   | 3 engineers on same object → each gets `itogo / 3`                                                                                                  |
| `engineerOnMultipleObjects_sumsShares`          | 1 engineer on 2 objects (itogo=0.032327 and itogo=0.020000) → `total_load = 0.032327 + 0.020000`                                                   |
| `engineerOnMultipleObjects_withDifferentCounts` | 1 engineer on obj A (2 engineers, itogo=0.04) and obj B (1 engineer, itogo=0.03) → share = `0.04/2 + 0.03/1 = 0.05`                                 |
| `loadRatio_normal`                              | `total_load = 0.032`, `capacity_fte = 1.0` → `load_ratio = 0.032`, status = `"normal"` (below 0.9 threshold)                                       |
| `loadRatio_warning`                             | `total_load = 0.95`, `capacity_fte = 1.0` → `load_ratio = 0.95`, status = `"warning"` (≥ 0.9 and < 1.0)                                            |
| `loadRatio_exactlyAtWarning`                    | `total_load = 0.9`, `capacity_fte = 1.0` → `load_ratio = 0.9`, status = `"warning"` (exactly at `ENGINEER_WARNING_THRESHOLD`)                      |
| `loadRatio_overloaded`                          | `total_load = 1.0`, `capacity_fte = 1.0` → `load_ratio = 1.0`, status = `"overloaded"` (≥ 1.0)                                                     |
| `loadRatio_overloadedAbove`                     | `total_load = 1.5`, `capacity_fte = 1.0` → `load_ratio = 1.5`, status = `"overloaded"`                                                             |
| `loadRatio_partTimeEngineer`                    | `total_load = 0.5`, `capacity_fte = 0.5` → `load_ratio = 1.0`, status = `"overloaded"`                                                             |
| `componentBreakdown_singleObject`              | For 1 engineer, 1 object: verify `os_load`, `ps_load`, `video_load`, `records_load`, `repair_load` are correctly computed per §6.12.2 formula        |
| `componentBreakdown_sumsLessThanTotalLoad`     | Component sum < total_load (PZV + travel gap per §6.12.2 note)                                                                                      |
| `noAssignments_totalLoadZero`                   | Engineer with zero assignments → `total_load = 0`, `object_count = 0`, `load_ratio = 0`                                                             |
| `recalculateAllForObject_updatesAllEngineers`   | Object has 2 engineers — calling `recalculateAllForObject(objectId)` recomputes both engineer summaries                                              |

**Test data for component breakdown:**

Use the reference object "Brest Archive" with known summary values:

```
os_monthly_avg = 40.683
ps_monthly_avg = 30.417
video_monthly_avg = 0
records_monthly = 0
repair_with_travel_monthly = 136.2
itogo_chislo_with_travel = 0.032327
```

Per §6.12.2, for 1 engineer (solo assignment):

```
component_coefficient[X] = monthly_avg_X / 60 / 142.8 × 1.12
os_load    = 40.683 / 60 / 142.8 × 1.12 = 0.005318  (approximately)
ps_load    = 30.417 / 60 / 142.8 × 1.12 = 0.003977
video_load = 0
records_load = 0
repair_load  = 136.2 / 60 / 142.8 × 1.12 = 0.017808
```

Sum ≈ 0.027103, which is less than 0.032327. The gap (≈0.005224) = `(pzv + round_trip_min) / 60 / 142.8 × 1.12 = (20+20) / 60 / 142.8 × 1.12 ≈ 0.005226`.

- [ ] **Step 2: Run test — expect FAIL (class not found)**

```bash
cd backend && mvn test -Dtest=EngineerWorkloadServiceTest -q
```

Expected: compilation error — `EngineerSummaryService` does not exist yet.

- [ ] **Step 3: Commit test file**

```bash
git add backend/src/test/java/com/workload/service/EngineerWorkloadServiceTest.java
git commit -m "test: add EngineerWorkloadServiceTest — workload split, status transitions, component breakdown"
```

### 3B: Implement EngineerSummaryService

- [ ] **Step 4: Create EngineerSummaryService.java**

`@Service` class. Injected dependencies: `ObjectEngineerRepository`, `SummaryRepository`, `EngineerSummaryRepository`, `UserRepository`, `WorkloadConfig`.

**Method: `recalculate(UUID engineerId)`**

Behavioral spec (follows §6.12–6.14 exactly):

1. Load all `object_engineers` rows for this engineer via `objectEngineerRepository.findAllByEngineerId(engineerId)`
2. For each assigned object:
   a. Load `summaries.itogo_chislo_with_travel` via `summaryRepository.findByObjectId(objectId)`
   b. Count engineers for this object: `engineerCount = objectEngineerRepository.countByObjectId(objectId)`
   c. `objectShare = itogo_chislo_with_travel / engineerCount` (BigDecimal divide, scale 10, HALF_UP)
   d. Per-component shares (§6.12.2):
      - `component_coefficient[X] = monthly_avg_X / 60 / config.getMonthlyHoursFund() × config.getAbsenceCoefficient()`
      - `componentShare[X] = component_coefficient[X] / engineerCount`
      - Components: os → `osMonthlyAvg`, ps → `psMonthlyAvg`, video → `videoMonthlyAvg`, records → `recordsMonthly`, repair → `repairWithTravelMonthly`
3. Aggregate: `totalLoad = SUM(objectShare)` across all objects
4. Component aggregation: `osLoad = SUM(osComponentShare)`, `psLoad = SUM(psComponentShare)`, etc.
5. Load `capacity_fte` from `User` entity
6. `loadRatio = totalLoad / capacityFte` (scale 6, HALF_UP)
7. Status (§6.13):
   - `loadRatio < config.getEngineerWarningThreshold()` → `"normal"`
   - `loadRatio >= config.getEngineerWarningThreshold() AND loadRatio < BigDecimal.ONE` → `"warning"`
   - `loadRatio >= BigDecimal.ONE` → `"overloaded"`
   - Note: use `BigDecimal.compareTo()` — never `==` or `.equals()`
8. Upsert to `engineer_summaries`: find existing by engineerId or create new. Set `computedAt = Instant.now()`.

**Edge case:** If engineer has zero assignments → `totalLoad = 0`, `objectCount = 0`, `loadRatio = 0`, `status = "normal"`, all component loads = 0.

**Edge case:** If a summary row doesn't exist yet for an object (M-02 recalculation not yet triggered for this object) → treat `itogo_chislo_with_travel` as `BigDecimal.ZERO`.

**Method: `recalculateAllForObject(UUID objectId)`**

1. Load all engineer IDs for this object: `objectEngineerRepository.findAllByObjectId(objectId)`
2. For each engineer, call `recalculate(engineerId)`

Add comment: `// PoC (S-02): recalculates all engineer summaries synchronously after object summary update.`

**Method: `deleteByEngineerId(UUID engineerId)`**

Removes the engineer summary row. Called when an engineer is deactivated or all assignments are removed.

- [ ] **Step 5: Run test — expect PASS**

```bash
cd backend && mvn test -Dtest=EngineerWorkloadServiceTest -q
```

**Critical:** All 15+ test methods must pass, especially the workload split and status transition tests.

- [ ] **Step 6: Commit**

```bash
git add backend/src/main/java/com/workload/service/EngineerSummaryService.java
git commit -m "feat: implement EngineerSummaryService — workload split, component breakdown, status"
```

---

## Task 4: Engineer CRUD Service and Controller

**Files:**

- Create: `backend/src/main/java/com/workload/exception/EngineerHasActiveAssignmentsException.java`
- Create: `backend/src/main/java/com/workload/service/EngineerService.java`
- Create: `backend/src/main/java/com/workload/controller/EngineerController.java`
- Create: `backend/src/test/java/com/workload/service/EngineerServiceTest.java`
- Create: `backend/src/test/java/com/workload/controller/EngineerControllerIT.java`
- Edit: `backend/src/main/java/com/workload/exception/GlobalExceptionHandler.java`

### 4A: Exception and GlobalExceptionHandler update

- [ ] **Step 1: Create EngineerHasActiveAssignmentsException.java**

Simple unchecked exception extending `RuntimeException`.

- [ ] **Step 2: Add handler to GlobalExceptionHandler**

Map `EngineerHasActiveAssignmentsException` → HTTP 409 with error code `ENGINEER_HAS_ACTIVE_ASSIGNMENTS`.

### 4B: EngineerService

**Method specifications:**

| Method                                       | Behavior                                                                                                                                                                                                                    |
| -------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `findAll(status?, homeDivisionId?)`          | Query `users` WHERE `role = 'engineer'`. Filter by `engineer_summaries.status` when `status` param is present. Filter by `home_division_id` when `homeDivisionId` param is present. Returns `List<EngineerDto>`.             |
| `findById(UUID)`                              | Load user, verify `role = 'engineer'`, join `engineer_summaries` if exists. Returns `EngineerDto`. Throws `EntityNotFoundException(ENGINEER_NOT_FOUND)` if not found or not an engineer.                                    |
| `create(EngineerCreateRequest)`              | Create `User` with `role='engineer'` (lowercase), `password_hash` via `PasswordEncoder`, `is_active=true`, `requires_activation=false`, `capacity_fte` from request. Returns `EngineerDto` (HTTP 201).                     |
| `update(UUID, EngineerUpdateRequest)`         | Update `name`, `capacity_fte`, `home_division_id`, `employee_id`. If `capacity_fte` changes, call `engineerSummaryService.recalculate(engineerId)`. Add comment: `// PoC (S-02): recalculates synchronously on capacity change.` |
| `deactivate(UUID)`                            | Set `is_active = false`. **Blocked** with `EngineerHasActiveAssignmentsException` if any `object_engineers` rows exist for this engineer. Does NOT delete the user — soft deactivation preserves historical data (AD-18).   |

### 4C: EngineerController

| Method   | Path                           | Description                                         |
| -------- | ------------------------------ | --------------------------------------------------- |
| `GET`    | `/api/v1/engineers`            | List engineers. Query params: `status`, `home_division_id` |
| `POST`   | `/api/v1/engineers`            | Create engineer (HTTP 201)                          |
| `GET`    | `/api/v1/engineers/{id}`       | Get engineer with summary                           |
| `PUT`    | `/api/v1/engineers/{id}`       | Update engineer                                     |
| `DELETE` | `/api/v1/engineers/{id}`       | Deactivate engineer (HTTP 204 on success)           |

All responses wrapped in `ApiResponse<T>` envelope.

### TDD Cycle

- [ ] **Step 3: Write EngineerServiceTest.java — unit test (Mockito)**

| Test method                                 | What it verifies                                                       |
| ------------------------------------------- | ---------------------------------------------------------------------- |
| `create_setsRoleToEngineer`                 | `user.role = "engineer"`, `is_active = true`                           |
| `create_hashesPassword`                     | `passwordEncoder.encode()` is called                                   |
| `findAll_filtersEngineersOnly`              | Query filters by `role = 'engineer'`                                   |
| `findAll_filtersByStatus`                   | When `status = "warning"`, only matching engineers returned            |
| `findAll_filtersByHomeDivision`             | When `homeDivisionId` present, filters correctly                       |
| `findById_notAnEngineer_throws`             | User with `role = 'admin'` → throws `EntityNotFoundException`          |
| `update_capacityChange_triggersRecalc`      | `capacity_fte` changes from 1.0 to 0.5 → `recalculate(engineerId)` called |
| `update_capacityUnchanged_noRecalc`         | `capacity_fte` unchanged → `recalculate` NOT called                    |
| `deactivate_noAssignments_setsInactive`     | `is_active = false` after deactivation                                 |
| `deactivate_hasAssignments_blockedWith409`  | Throws `EngineerHasActiveAssignmentsException`                         |

- [ ] **Step 4: Write EngineerControllerIT.java — integration test (RestAssured + Testcontainers)**

| Test method                                          | What it verifies                                              |
| ---------------------------------------------------- | ------------------------------------------------------------- |
| `createEngineer_returns201_withEngineerRole`         | POST returns 201, body has `role=engineer`                    |
| `createEngineer_duplicateEmail_returns409`            | Duplicate email → 409 `NAME_CONFLICT`                         |
| `getEngineers_filtersEngineersOnly`                   | GET returns only users with `role=engineer`                   |
| `getEngineers_filterByStatus`                         | GET with `?status=normal` returns filtered list               |
| `getEngineer_notFound_returns404`                     | GET with nonexistent ID → 404 `ENGINEER_NOT_FOUND`            |
| `updateEngineer_changesCapacity`                      | PUT with new capacity_fte persists and triggers recalculation |
| `deactivateEngineer_noAssignments_returns204`         | DELETE returns 204, user.is_active = false                    |
| `deactivateEngineer_hasAssignments_returns409`        | DELETE blocked → 409 `ENGINEER_HAS_ACTIVE_ASSIGNMENTS`        |

All integration tests use JWT auth header from the seed admin user (created in `v1.0.2-seed-admin.xml`).

- [ ] **Step 5: Run tests — expect FAIL**

```bash
cd backend && mvn test -Dtest="EngineerServiceTest,EngineerControllerIT" -q
```

- [ ] **Step 6: Implement EngineerService, EngineerController, exception handler update**

- [ ] **Step 7: Run tests — expect PASS**

```bash
cd backend && mvn test -Dtest="EngineerServiceTest,EngineerControllerIT" -q
```

- [ ] **Step 8: Commit**

```bash
git add backend/src/main/java/com/workload/exception/EngineerHasActiveAssignmentsException.java \
        backend/src/main/java/com/workload/exception/GlobalExceptionHandler.java \
        backend/src/main/java/com/workload/service/EngineerService.java \
        backend/src/main/java/com/workload/controller/EngineerController.java \
        backend/src/test/java/com/workload/service/EngineerServiceTest.java \
        backend/src/test/java/com/workload/controller/EngineerControllerIT.java
git commit -m "feat: add engineer CRUD — create, list, update, deactivate with 409 guard"
```

---

## Task 5: Object-Engineer Assignment Endpoints

**Files:**

- Create: `backend/src/main/java/com/workload/service/ObjectEngineerService.java`
- Create: `backend/src/main/java/com/workload/controller/ObjectEngineerController.java`
- Create: `backend/src/test/java/com/workload/service/ObjectEngineerServiceTest.java`
- Create: `backend/src/test/java/com/workload/controller/ObjectEngineerControllerIT.java`

### ObjectEngineerService

**Method specifications:**

| Method                                               | Behavior                                                                                                                                                                                                                                                                    |
| ---------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `getEngineersForObject(UUID objectId)`                | Load all `object_engineers` for this object. For each, compute `objectShare = itogo_chislo_with_travel / engineerCount`. Return `List<EngineerShareDto>`.                                                                                                                   |
| `getObjectsForEngineer(UUID engineerId)`              | Load all `object_engineers` for this engineer. For each, compute `engineerShare`. Return `List<EngineerObjectDto>`.                                                                                                                                                         |
| `assignEngineerToObject(UUID objectId, UUID engineerId)` | Validate: (1) user exists and `role == 'engineer'`; (2) `is_active == true` (AD-18); (3) object exists; (4) no existing assignment for this (object, engineer) pair. Create `ObjectEngineer` row with `assignedAt = Instant.now()`. Call `recalculateAllForObject(objectId)`. Add comment: `// PoC (S-02): recalculates all affected engineer summaries synchronously.` |
| `removeEngineerFromObject(UUID objectId, UUID engineerId)` | Delete the `ObjectEngineer` row. Call `recalculateAllForObject(objectId)` to redistribute shares among remaining engineers. Also call `engineerSummaryService.recalculate(engineerId)` for the removed engineer (their total load decreases). |

**Validation error codes:**

- User not found → 404 `ENGINEER_NOT_FOUND`
- User is not an engineer (role ≠ engineer) → 422 `INVALID_ENGINEER_ROLE`
- User is inactive → 422 `ENGINEER_INACTIVE`
- Object not found → 404 `OBJECT_NOT_FOUND`
- Assignment already exists → 409 `CONSTRAINT_VIOLATION`

### ObjectEngineerController

**Object-side endpoints:**

| Method   | Path                                     | Description                           |
| -------- | ---------------------------------------- | ------------------------------------- |
| `GET`    | `/api/v1/objects/{id}/engineers`          | List engineers for an object          |
| `POST`   | `/api/v1/objects/{id}/engineers`          | Assign engineer to object             |
| `DELETE` | `/api/v1/objects/{id}/engineers/{eid}`    | Remove engineer from object           |

**Engineer-side mirror endpoints:**

| Method   | Path                                     | Description                           |
| -------- | ---------------------------------------- | ------------------------------------- |
| `GET`    | `/api/v1/engineers/{id}/objects`          | List objects for an engineer          |
| `POST`   | `/api/v1/engineers/{id}/objects`          | Assign object to engineer             |
| `DELETE` | `/api/v1/engineers/{id}/objects/{oid}`    | Remove object from engineer           |

**Engineer summary endpoint:**

| Method   | Path                                     | Description                           |
| -------- | ---------------------------------------- | ------------------------------------- |
| `GET`    | `/api/v1/engineers/{id}/summary`          | Get engineer summary                  |

`GET /engineers/{id}/summary` returns `EngineerSummaryDto` or 404 `SUMMARY_NOT_FOUND` if no summary row exists.

All responses wrapped in `ApiResponse<T>` envelope.

### TDD Cycle

- [ ] **Step 1: Write ObjectEngineerServiceTest.java — unit test (Mockito)**

| Test method                                      | What it verifies                                                                   |
| ------------------------------------------------ | ---------------------------------------------------------------------------------- |
| `assign_validEngineer_createsRow`                | Creates `ObjectEngineer` row, calls `recalculateAllForObject`                       |
| `assign_inactiveEngineer_throws422`              | `is_active = false` → throws with code `ENGINEER_INACTIVE`                          |
| `assign_nonEngineerRole_throws422`               | `role = 'admin'` → throws with code `INVALID_ENGINEER_ROLE`                         |
| `assign_objectNotFound_throws404`                | Nonexistent object → `EntityNotFoundException(OBJECT_NOT_FOUND)`                    |
| `assign_duplicateAssignment_throws409`            | Same (object, engineer) already exists → 409 `CONSTRAINT_VIOLATION`                 |
| `remove_existingAssignment_deletesAndRecalculates`| Deletes row, calls `recalculateAllForObject` + `recalculate(removedEngineerId)`     |
| `remove_nonexistentAssignment_throws404`          | No such assignment → 404                                                            |
| `getEngineersForObject_computesShares`            | 2 engineers on object with itogo=0.04 → each share = 0.02                          |
| `getObjectsForEngineer_computesShares`            | Engineer on 2 objects → correct per-object shares                                   |

- [ ] **Step 2: Write ObjectEngineerControllerIT.java — integration test (RestAssured + Testcontainers)**

| Test method                                            | What it verifies                                                         |
| ------------------------------------------------------ | ------------------------------------------------------------------------ |
| `assignEngineerToObject_returns200_engineerSummaryUpdated` | POST assigns, then GET /engineers/{id}/summary shows updated load        |
| `assignEngineerToObject_inactiveEngineer_returns422`    | Inactive engineer → 422                                                  |
| `assignEngineerToObject_duplicate_returns409`            | Same assignment twice → 409                                              |
| `removeEngineerFromObject_returns204_sharesRedistributed` | 2 engineers → remove 1 → remaining engineer's share doubles              |
| `getObjectEngineers_returnsPerEngineerShares`            | GET returns correct `objectShare` for each engineer                      |
| `getEngineerObjects_returnsPerObjectShares`              | GET returns correct `engineerShare` for each object                      |
| `getEngineerSummary_returns200`                          | GET /engineers/{id}/summary returns full summary DTO                     |
| `getEngineerSummary_notFound_returns404`                 | No summary → 404 `SUMMARY_NOT_FOUND`                                    |
| `mirrorEndpoints_bothSidesConsistent`                    | Assign via `/objects/:id/engineers` → verify via `/engineers/:id/objects` |

Integration test data setup:
1. Create division → branch → object with equipment (device + assignment → triggers M-02 recalculation → summary row exists)
2. Create 2 engineers via `POST /engineers`
3. Assign both to the object
4. Verify shares, summaries, and status

- [ ] **Step 3: Run tests — expect FAIL**

```bash
cd backend && mvn test -Dtest="ObjectEngineerServiceTest,ObjectEngineerControllerIT" -q
```

- [ ] **Step 4: Implement ObjectEngineerService and ObjectEngineerController**

- [ ] **Step 5: Run tests — expect PASS**

```bash
cd backend && mvn test -Dtest="ObjectEngineerServiceTest,ObjectEngineerControllerIT" -q
```

- [ ] **Step 6: Commit**

```bash
git add backend/src/main/java/com/workload/service/ObjectEngineerService.java \
        backend/src/main/java/com/workload/controller/ObjectEngineerController.java \
        backend/src/test/java/com/workload/service/ObjectEngineerServiceTest.java \
        backend/src/test/java/com/workload/controller/ObjectEngineerControllerIT.java
git commit -m "feat: add object-engineer assignment endpoints with synchronous recalculation (S-02)"
```

---

## Task 6: Wire Engineer Recalculation into Object Calculation Pipeline

When equipment, records, repairs, or travel data changes for an object, the existing `CalculationService.recalculate(objectId)` updates `summaries`. After that, all engineers assigned to the object need their summaries updated too.

**Files:**

- Edit: `backend/src/main/java/com/workload/service/calculation/CalculationService.java`
- Edit: `backend/src/main/java/com/workload/service/ObjectService.java` (for delete cascade)
- Create: `backend/src/test/java/com/workload/service/EngineerRecalculationWiringIT.java`

### Behavioral Requirements

1. **CalculationService.recalculate(objectId):** After computing and persisting the `summaries` row, call `engineerSummaryService.recalculateAllForObject(objectId)`. Add comment: `// PoC (S-02): calls engineer summary recalculation synchronously after object summary update.`

2. **ObjectService.delete(objectId):** Before the cascade delete, read all engineer IDs assigned to this object. After the delete, recalculate engineer summaries for each affected engineer (their load decreases because they lose the deleted object). The cascade `ON DELETE CASCADE` on `object_engineers` removes the join table rows automatically — the service only needs to recalculate.

### TDD Cycle

- [ ] **Step 1: Write EngineerRecalculationWiringIT.java**

`@SpringBootTest` with Testcontainers. Full integration test:

| Test method                                                        | What it verifies                                                                                                |
| ------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------- |
| `updateDeviceQuantity_updatesEngineerSummary`                       | Change device qty → `summaries` updated → `engineer_summaries.total_load` updated for assigned engineer          |
| `updateRecords_updatesEngineerSummary`                              | Add records → `engineer_summaries.records_load > 0` for assigned engineer                                       |
| `deleteObject_recalculatesAffectedEngineers`                        | Delete object with 2 assigned engineers → both engineers' summaries updated (total_load decreases)               |
| `endToEnd_assignEquipmentAndEngineer_verifySummary`                 | Full chain: create object → add device + assignment → recalc → assign engineer → verify engineer summary matches |

- [ ] **Step 2: Run test — expect FAIL** (wiring not done yet)

```bash
cd backend && mvn test -Dtest=EngineerRecalculationWiringIT -q
```

- [ ] **Step 3: Wire recalculation**

1. Inject `EngineerSummaryService` into `CalculationService`
2. At end of `recalculate(objectId)`, add: `engineerSummaryService.recalculateAllForObject(objectId);`
3. In `ObjectService.delete(objectId)`:
   - Before delete: `List<UUID> affectedEngineers = objectEngineerRepository.findAllByObjectId(objectId).stream().map(oe -> oe.getEngineer().getId()).toList();`
   - After delete: `affectedEngineers.forEach(engineerSummaryService::recalculate);`

- [ ] **Step 4: Run test — expect PASS**

```bash
cd backend && mvn test -Dtest=EngineerRecalculationWiringIT -q
```

- [ ] **Step 5: Commit**

```bash
git add backend/src/main/java/com/workload/service/calculation/CalculationService.java \
        backend/src/main/java/com/workload/service/ObjectService.java \
        backend/src/test/java/com/workload/service/EngineerRecalculationWiringIT.java
git commit -m "feat: wire engineer summary recalculation into object calculation pipeline (S-02)"
```

---

## Task 7: Update Aggregation Service for Engineer Data

The M-02 `AggregationService` already computes division-level FTE totals. M-03 adds engineer-related counts to the division and branch aggregation responses.

**Files:**

- Edit: `backend/src/main/java/com/workload/service/AggregationService.java`
- Edit: `backend/src/main/java/com/workload/dto/AggregationDivisionDto.java`
- Edit: `backend/src/main/java/com/workload/dto/AggregationBranchDto.java`
- Edit or create: `backend/src/test/java/com/workload/service/AggregationServiceEngineerTest.java`

### New Fields in AggregationDivisionDto

| Field                  | Type    | Computation                                                                                              |
| ---------------------- | ------- | -------------------------------------------------------------------------------------------------------- |
| `engineersTotal`       | Integer | `COUNT(users WHERE role='engineer' AND is_active=true AND home_division_id = division.id)`                |
| `engineersOverloaded`  | Integer | `COUNT(engineer_summaries WHERE status='overloaded')` for engineers in this division                      |
| `engineersWarning`     | Integer | `COUNT(engineer_summaries WHERE status='warning')` for engineers in this division                         |

### New Fields in AggregationBranchDto

Per §16.6, `engineersOverloaded` and `engineersWarning` at branch level are the **division-level** metrics echoed per branch — not a true branch-scoped count. `engineersTotal` at branch level may either be echoed or set to zero (plan preserves division-level echo to match TOR §16.6 note).

### TDD Cycle

- [ ] **Step 1: Write AggregationServiceEngineerTest.java — unit test**

| Test method                                        | What it verifies                                                     |
| -------------------------------------------------- | -------------------------------------------------------------------- |
| `divisionAggregation_includesEngineerCounts`       | engineersTotal, engineersOverloaded, engineersWarning populated       |
| `divisionAggregation_zeroEngineers_returnsZeroes`  | Division with no engineers → all engineer fields = 0                 |
| `branchAggregation_echosDivisionEngineerCounts`    | Branch response uses division-level engineer counters (§16.6 note)   |

- [ ] **Step 2: Run test — expect FAIL**

```bash
cd backend && mvn test -Dtest=AggregationServiceEngineerTest -q
```

- [ ] **Step 3: Update AggregationService with engineer count queries**

Add engineer count logic to `getDivisions()` and `getDivision(UUID)` methods. Use `UserRepository` to count by `home_division_id` and `EngineerSummaryRepository` for status counts.

- [ ] **Step 4: Run test — expect PASS**

```bash
cd backend && mvn test -Dtest=AggregationServiceEngineerTest -q
```

- [ ] **Step 5: Run existing M-02 aggregation tests to verify no regressions**

```bash
cd backend && mvn test -Dtest="AggregationServiceTest,AggregationControllerIT" -q
```

Expected: All existing tests still pass.

- [ ] **Step 6: Commit**

```bash
git add backend/src/main/java/com/workload/service/AggregationService.java \
        backend/src/main/java/com/workload/dto/AggregationDivisionDto.java \
        backend/src/main/java/com/workload/dto/AggregationBranchDto.java \
        backend/src/test/java/com/workload/service/AggregationServiceEngineerTest.java
git commit -m "feat: add engineer counts to division and branch aggregations"
```

---

## Task 8: Run All Quality Gates

- [ ] **Step 1: Auto-format**

```bash
cd backend && mvn spotless:apply
```

- [ ] **Step 2: Full verify**

```bash
cd backend && mvn verify
```

Expected: `BUILD SUCCESS`. Check:

- All unit tests pass
- All integration tests pass (Testcontainers)
- Jacoco thresholds pass:
  - `*.service.calculation.*` ≥ 95% line, ≥ 90% branch (includes `EngineerSummaryService` calculation code)
  - `*.service.*` (other) ≥ 80% line, ≥ 75% branch
  - `*.mapper.*` ≥ 80% line
  - Overall ≥ 75% line, ≥ 70% branch
- Spotless: clean (no formatting violations)
- SpotBugs: no HIGH findings
- No existing M-01 or M-02 tests are broken (regression-free)

- [ ] **Step 3: Fix any failures**

If Jacoco thresholds fail, add missing test cases (most likely edge cases in engineer summary or assignment validation).
If SpotBugs flags BigDecimal comparison issues, ensure all comparisons use `.compareTo()`.
If existing tests fail, investigate — M-03 changes to `CalculationService` and `ObjectService` must not break M-02 behavior.

- [ ] **Step 4: Final commit and push**

```bash
git add -A
git commit -m "chore: fix quality gate issues"
git push -u origin feature/poc-m03-backend
```

---

## Acceptance Criteria Traceability

| Criterion                                              | Where verified                                                                                                |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------- |
| §4.10 Engineer CRUD                                    | `EngineerServiceTest`, `EngineerControllerIT` — create, list (filter by status/division), update, deactivate  |
| §4.11 Object-engineer assignments                      | `ObjectEngineerServiceTest`, `ObjectEngineerControllerIT` — assign, remove, mirror endpoints                  |
| §6.12.1 Object share per engineer (equal split)        | `EngineerWorkloadServiceTest` — 1, 2, 3 co-engineers, multi-object                                           |
| §6.12.2 Component breakdown                           | `EngineerWorkloadServiceTest.componentBreakdown_*` — per-system loads, PZV+travel gap                         |
| §6.13 Load ratio and status                            | `EngineerWorkloadServiceTest.loadRatio_*` — normal, warning (≥0.9), overloaded (≥1.0), part-time              |
| §6.14 Cache invalidation                              | `EngineerRecalculationWiringIT` — source data mutation → engineer summary updated                             |
| AD-18 `is_active` filtering                            | `ObjectEngineerServiceTest.assign_inactiveEngineer_throws422`, `ObjectEngineerControllerIT`                   |
| C-24 Soft deactivation                                 | `EngineerServiceTest.deactivate_*` — blocked if assignments exist, sets `is_active=false`                     |
| S-02 Synchronous recalculation                         | All recalculation happens within the request thread — no `is_stale`, no background worker                     |
| S-04 No RBAC enforcement                               | All endpoints callable by any authenticated user                                                               |
| Error code `ENGINEER_HAS_ACTIVE_ASSIGNMENTS` (409)     | `EngineerControllerIT.deactivateEngineer_hasAssignments_returns409`                                           |
| Error code `ENGINEER_INACTIVE` (422)                   | `ObjectEngineerControllerIT.assignEngineerToObject_inactiveEngineer_returns422`                                |
| Error code `ENGINEER_NOT_FOUND` (404)                  | `EngineerControllerIT.getEngineer_notFound_returns404`                                                         |
| CONTRIBUTING.md mandatory `EngineerWorkloadServiceTest` | Task 3 — all workload split, load_ratio, and status tests                                                     |
