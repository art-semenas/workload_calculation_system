# WS-C Step 7 — MVP M-07: Planning Periods Backend

> **For agentic workers:** Use `superpowers:executing-plans` to implement this plan task-by-task.

**Goal:** Reverse PoC simplification S-05. Add `periods` table. Add `period_id` FKs to `records_tasks` and `object_repairs` with updated UNIQUE constraints. Enforce active period requirement on all records/repairs writes. Add planning period CRUD endpoints (`/admin/periods`). Add period filtering to СВОД and export endpoints.

**Branch:** `feature/mvp-m07-periods-backend`
**Depends on:** `feature/mvp-m06-background-backend` merged to `feature/implementation`
**Phase:** MVP
**Epic:** `docs/impl/epics/mvp-m07-periods.md`

---

## Source-Of-Truth Alignment

1. `docs/impl/epics/mvp-m07-periods.md` — scope, ACs, DB schema changes
2. `docs/TOR_Workload_WebApp.md §4.12` — planning period business rules
3. `docs/impl/api-spec.md §"Planning Periods"` — endpoint contracts
4. `CONTRIBUTING.md` — TDD required; `mvn verify` must pass

**PoC simplification being reversed:**
- S-05: No planning periods. `records_tasks` and `object_repairs` had no `period_id`. This milestone adds period scoping.

**Critical note:** This migration modifies the UNIQUE constraints on `records_tasks` and `object_repairs`. Existing PoC rows have no `period_id`. A backfill strategy is required before the migration can complete — create a "Migration" period and assign all existing rows to it.

---

## Task 0: Create feature branch

- [ ] **Step 1:**

```bash
git checkout feature/implementation
git pull origin feature/implementation
git checkout -b feature/mvp-m07-periods-backend
```

---

## Task 1: `periods` table migration

**Files:**
- Create: `backend/src/main/resources/db/changelog/changes/v1.3.0-mvp-m07-periods.xml`
- Update: `backend/src/main/resources/db/changelog/db.changelog-master.xml`

**Migration steps:**
1. Create `periods` table
2. Insert a "Migration H1 2025" period with `is_active = TRUE`
3. Add nullable `period_id` to `records_tasks`
4. Backfill: `UPDATE records_tasks SET period_id = (SELECT id FROM periods WHERE name = 'Migration H1 2025')`
5. Add `NOT NULL` constraint after backfill
6. Drop old `UNIQUE(object_id)` constraint on `records_tasks`
7. Add new `UNIQUE(object_id, period_id)`
8. Repeat steps 3-7 for `object_repairs` with `UNIQUE(object_id, repair_type_id)` → `UNIQUE(object_id, repair_type_id, period_id)`

```xml
<changeSet id="v1.3.0-1" author="dev">
  <createTable tableName="periods">
    <column name="id" type="UUID"><constraints primaryKey="true"/></column>
    <column name="name" type="VARCHAR(50)"><constraints nullable="false" unique="true"/></column>
    <column name="start_date" type="DATE"><constraints nullable="false"/></column>
    <column name="end_date" type="DATE"><constraints nullable="false"/></column>
    <column name="is_active" type="BOOLEAN" defaultValueBoolean="false"><constraints nullable="false"/></column>
    <column name="created_at" type="TIMESTAMP"/>
    <column name="updated_at" type="TIMESTAMP"/>
  </createTable>
  <sql>CREATE UNIQUE INDEX one_active_period ON periods (is_active) WHERE is_active = TRUE</sql>
  <!-- seed migration period and backfill existing rows -->
  <sql>INSERT INTO periods (id, name, start_date, end_date, is_active, created_at)
       VALUES (gen_random_uuid(), 'Migration H1 2025', '2025-01-01', '2025-06-30', TRUE, NOW())</sql>
  <!-- ... addColumn, backfill, NOT NULL, drop old UNIQUE, add new UNIQUE -->
  <rollback>
    <!-- drop period_id columns, restore old unique constraints, drop periods table -->
  </rollback>
</changeSet>
```

- [ ] **Step 1: Write failing migration test**

```java
@Test
void periodsTableExistsWithActiveIndex() {
    Integer count = jdbcTemplate.queryForObject(
        "SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'periods'",
        Integer.class);
    assertThat(count).isEqualTo(1);
}

@Test
void recordsTasksHasPeriodIdColumn() {
    Integer count = jdbcTemplate.queryForObject(
        "SELECT COUNT(*) FROM information_schema.columns " +
        "WHERE table_name='records_tasks' AND column_name='period_id'",
        Integer.class);
    assertThat(count).isEqualTo(1);
}
```

- [ ] **Step 2: Run — expect FAIL**
- [ ] **Step 3: Write full migration changeset**
- [ ] **Step 4: Run — expect PASS**
- [ ] **Step 5: Update JPA entities** — `Period`, update `RecordsTask` and `ObjectRepair` to include `periodId`
- [ ] **Step 6: Commit**

```bash
git add backend/src/main/resources/db/changelog/ backend/src/main/java/com/workload/entity/
git commit -m "feat: add periods table and period_id FK to records_tasks and object_repairs via Liquibase v1.3.0"
```

---

## Task 2: `Period` entity, repository, DTO

**Files:**
- Create: `backend/src/main/java/com/workload/entity/Period.java`
- Create: `backend/src/main/java/com/workload/repository/PeriodRepository.java`
- Create: `backend/src/main/java/com/workload/dto/PeriodDto.java`
- Create: `backend/src/main/java/com/workload/mapper/PeriodMapper.java`

- [ ] **Step 1: Create entities and DTOs**

```java
public interface PeriodRepository extends JpaRepository<Period, UUID> {
    Optional<Period> findByIsActiveTrue();
    boolean existsByIsActiveTrue();
}

public record PeriodDto(UUID id, String name, LocalDate startDate, LocalDate endDate, boolean isActive) {}
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/main/java/com/workload/entity/Period.java backend/src/main/java/com/workload/repository/ backend/src/main/java/com/workload/dto/PeriodDto.java
git commit -m "feat: add Period entity, repository, DTO, and mapper"
```

---

## Task 3: `/admin/periods` CRUD endpoints

**Files:**
- Create: `backend/src/main/java/com/workload/service/PeriodService.java`
- Create: `backend/src/main/java/com/workload/controller/PeriodController.java`
- Create: `backend/src/test/java/com/workload/controller/PeriodControllerIT.java`

**Endpoints:**
- `GET /admin/periods` — list all periods. Admin only.
- `POST /admin/periods` — create period. Body: `{ name, startDate, endDate }`. Admin only.
- `GET /admin/periods/active` — returns active period or 404. All authenticated roles.
- `GET /admin/periods/:id` — get period by ID. Admin only.
- `PUT /admin/periods/:id/activate` — set active. Deactivates current active period in same transaction. Admin only.

AC-30: `PUT /admin/periods/:id/activate` sets is_active=true and deactivates previously active period atomically.

- [ ] **Step 1: Write failing tests**

```java
@Test
void createPeriodReturns201() {
    given().auth().oauth2(adminToken)
        .body(Map.of("name", "H2 2025", "startDate", "2025-07-01", "endDate", "2025-12-31"))
        .contentType(ContentType.JSON)
        .post("/admin/periods")
        .then().statusCode(201)
        .body("data.name", equalTo("H2 2025"));
}

@Test
void activatePeriodDeactivatesPreviousOne() {
    UUID p1 = createAndActivatePeriod("H1 2025");
    UUID p2 = createPeriod("H2 2025");
    given().auth().oauth2(adminToken)
        .put("/admin/periods/" + p2 + "/activate")
        .then().statusCode(200);
    // verify p1 is now is_active=false
    // verify p2 is now is_active=true
}
```

- [ ] **Step 2: Implement `PeriodService` and `PeriodController`**
- [ ] **Step 3: Run tests — expect PASS**
- [ ] **Step 4: Commit**

```bash
git add backend/src/main/java/com/workload/service/PeriodService.java backend/src/main/java/com/workload/controller/PeriodController.java
git commit -m "feat: add /admin/periods CRUD endpoints with activate/deactivate (admin only)"
```

---

## Task 4: Period enforcement on records and repairs writes

**Files:**
- Modify: `backend/src/main/java/com/workload/service/RecordsService.java`
- Modify: `backend/src/main/java/com/workload/service/RepairService.java`

**Rules:**
- All writes to `records_tasks` and `object_repairs` default to `period_id = activePeriod.id`
- If no active period: return HTTP 422 `"No active planning period. Ask your administrator to activate a period."`
- If target period is deactivated: return HTTP 422 `"This period is read-only. Data cannot be modified after a period is deactivated."`

AC-31: Writes targeting deactivated period return 422.
AC-32: Writes when no active period return 422.

- [ ] **Step 1: Write failing tests for AC-31 and AC-32**

```java
@Test
void ac31RecordsWriteToDeactivatedPeriodReturns422() {
    UUID deactivatedPeriodId = createAndDeactivatePeriod();
    // PUT /objects/:id/records with period context
    // Verify 422
}

@Test
void ac32RecordsWriteWithNoActivePeriodReturns422() {
    // deactivate all periods
    // PUT /objects/:id/records
    // Verify 422 with "No active planning period" message
}
```

- [ ] **Step 2: Update service layer with period enforcement**

```java
// In RecordsService.updateRecords():
Period activePeriod = periodRepository.findByIsActiveTrue()
    .orElseThrow(() -> new NoActivePeriodException());
// Use activePeriod.getId() as period_id for upsert
```

- [ ] **Step 3: Run tests — expect PASS**
- [ ] **Step 4: Commit**

```bash
git add backend/src/main/java/com/workload/service/
git commit -m "feat: enforce active period on records and repairs writes (reverses S-05)"
```

---

## Task 5: Period filtering on read endpoints

**Files:**
- Modify: `backend/src/main/java/com/workload/controller/ObjectController.java`
- Modify: `backend/src/main/java/com/workload/controller/SvodController.java`
- Modify: related service classes

**Changes:**
- `GET /objects/:id/records` — `?periodId=` param; defaults to active period
- `GET /objects/:id/repairs` — same
- `GET /svod` — `?periodId=` param; defaults to active period
- `GET /svod/export/xlsx` — `?periodId=` param; defaults to active period

AC-19: Records from H1 2025 do not appear when querying H2 2025 period.

- [ ] **Step 1: Write AC-19 test**

```java
@Test
void ac19RepairsArePeriodScoped() {
    UUID h1 = activatePeriod("H1 2025");
    // create repair count in H1
    UUID h2 = activatePeriod("H2 2025");
    // GET /objects/:id/repairs (defaults to H2)
    // Verify repair count is 0 (no H2 row exists)
}
```

- [ ] **Step 2: Update repository queries** to filter by `period_id`
- [ ] **Step 3: Update controllers** to accept `?periodId=` param
- [ ] **Step 4: Run test — expect PASS**
- [ ] **Step 5: Commit**

```bash
git add backend/src/main/java/com/workload/
git commit -m "feat: add period filtering to records, repairs, СВОД and export endpoints"
```

---

## Task 6: Run full backend quality gates

- [ ] **Step 1:**

```bash
cd backend
mvn spotless:apply
mvn verify
```

Expected: `BUILD SUCCESS`.

- [ ] **Step 2: Fix any failures**
- [ ] **Step 3: Push**

```bash
git push -u origin feature/mvp-m07-periods-backend
```

---

## Final Scope Checklist

- [ ] `periods` table created with `one_active_period` unique partial index
- [ ] `period_id` FK added to `records_tasks` with `UNIQUE(object_id, period_id)`
- [ ] `period_id` FK added to `object_repairs` with `UNIQUE(object_id, repair_type_id, period_id)`
- [ ] Existing PoC rows backfilled to "Migration H1 2025" period
- [ ] `GET/POST /admin/periods`, `GET /admin/periods/active`, `PUT /admin/periods/:id/activate`
- [ ] Activate endpoint atomically deactivates current active period (AC-30)
- [ ] Records and repairs writes return 422 when no active period (AC-32)
- [ ] Records and repairs writes return 422 when targeting deactivated period (AC-31)
- [ ] `GET /objects/:id/records` and `GET /objects/:id/repairs` support `?periodId=` param
- [ ] `GET /svod` supports `?periodId=` param for historical СВОД
- [ ] AC-19: period isolation verified (H1 data not visible in H2 query)
- [ ] `mvn verify` passes

## References

- `docs/impl/epics/mvp-m07-periods.md`
- `docs/TOR_Workload_WebApp.md §4.12`
- `docs/impl/api-spec.md §"Planning Periods"`
