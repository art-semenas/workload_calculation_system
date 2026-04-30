# WS-C Step 5 — MVP M-06: Background Recalculation Backend

> **For agentic workers:** Use `superpowers:executing-plans` to implement this plan task-by-task.

**Goal:** Reverse PoC simplification S-02. Replace synchronous recalculation with staleness tracking: all source-data write operations now mark `summaries.is_stale = 'TRUE'` instead of triggering immediate recalculation. Add `is_stale` columns to `summaries` and `engineer_summaries`. Add Redis-backed background worker. Add admin-triggered `POST /svod/recalculate` endpoint.

**Branch:** `feature/mvp-m06-background-backend`
**Depends on:** `feature/mvp-m02-rbac-backend` merged to `feature/implementation`
**Phase:** MVP
**Epic:** `docs/impl/epics/mvp-m06-background.md`

---

## Source-Of-Truth Alignment

1. `docs/impl/epics/mvp-m06-background.md` — scope, ACs, DB schema changes, invalidation rules
2. `docs/TOR_Workload_WebApp.md §6.10, §17` — cache invalidation rules, concurrency/locking
3. `docs/impl/api-spec.md §"Background recalculation"` — endpoint contracts
4. `CONTRIBUTING.md` — TDD required; `mvn verify` must pass

**PoC simplification being reversed:**
- S-02: Synchronous recalculation → staleness tracking + background worker

---

## Task 0: Create feature branch

- [ ] **Step 1:**

```bash
git checkout feature/implementation
git pull origin feature/implementation
git checkout -b feature/mvp-m06-background-backend
```

---

## Task 1: Liquibase migration — add `is_stale` columns

**Files:**
- Create: `backend/src/main/resources/db/changelog/changes/v1.2.0-mvp-m06-staleness.xml`
- Update: `backend/src/main/resources/db/changelog/db.changelog-master.xml`

**New columns and indexes:**

```xml
<changeSet id="v1.2.0-1" author="dev">
  <addColumn tableName="summaries">
    <column name="is_stale" type="VARCHAR(20)" defaultValue="FALSE">
      <constraints nullable="false"/>
    </column>
    <column name="period_id" type="UUID"/>
    <column name="records_6months" type="DECIMAL(10,4)"/>
    <column name="repair_work_6months" type="DECIMAL(10,4)"/>
    <column name="repair_travel_6months" type="DECIMAL(10,4)"/>
    <column name="repair_pzv_6months" type="DECIMAL(10,4)"/>
    <column name="total_repairs" type="INTEGER"/>
  </addColumn>
  <addColumn tableName="engineer_summaries">
    <column name="is_stale" type="VARCHAR(20)" defaultValue="FALSE">
      <constraints nullable="false"/>
    </column>
  </addColumn>
  <sql>CREATE INDEX idx_summaries_stale ON summaries(is_stale) WHERE is_stale = 'TRUE'</sql>
  <sql>CREATE INDEX idx_summaries_processing ON summaries(is_stale) WHERE is_stale = 'PROCESSING'</sql>
  <sql>CREATE INDEX idx_eng_summaries_stale ON engineer_summaries(is_stale) WHERE is_stale = 'TRUE'</sql>
  <sql>CREATE INDEX idx_eng_summaries_processing ON engineer_summaries(is_stale) WHERE is_stale = 'PROCESSING'</sql>
  <rollback>
    <dropColumn tableName="summaries" columnName="is_stale"/>
    <dropColumn tableName="summaries" columnName="period_id"/>
    <!-- ... other rollback columns -->
    <dropColumn tableName="engineer_summaries" columnName="is_stale"/>
  </rollback>
</changeSet>
```

- [ ] **Step 1: Write failing migration test**

```java
@Test
void isStaleColumnExistsOnSummaries() {
    Integer count = jdbcTemplate.queryForObject(
        "SELECT COUNT(*) FROM information_schema.columns " +
        "WHERE table_name='summaries' AND column_name='is_stale'",
        Integer.class);
    assertThat(count).isEqualTo(1);
}
```

- [ ] **Step 2: Run — expect FAIL**
- [ ] **Step 3: Create migration changeset**
- [ ] **Step 4: Run — expect PASS**
- [ ] **Step 5: Update `Summary` and `EngineerSummary` entities** to add `isStale` field
- [ ] **Step 6: Commit**

```bash
git add backend/src/main/resources/db/changelog/ backend/src/main/java/com/workload/entity/
git commit -m "feat: add is_stale columns to summaries and engineer_summaries via Liquibase v1.2.0"
```

---

## Task 2: Staleness marking service

**Files:**
- Create: `backend/src/main/java/com/workload/service/StaleMarkingService.java`
- Create: `backend/src/test/java/com/workload/service/StaleMarkingServiceTest.java`

**Responsibilities:**
- `markObjectStale(UUID objectId)` — sets `summaries.is_stale = 'TRUE'` for the given object's summary row, in same transaction as the caller
- `markEngineerSummaryStaleFroObject(UUID objectId)` — marks `engineer_summaries.is_stale = 'TRUE'` for all engineers assigned to the given object
- `markAllContextObjects(UUID contextId)` — marks stale for all objects with `object_system_assignments` using this context
- `markAllRepairTypeObjects(UUID repairTypeId)` — marks stale for all objects with `object_repairs` using this repair type
- `markEngineerStale(UUID engineerId)` — marks `engineer_summaries.is_stale = 'TRUE'` for the given engineer

- [ ] **Step 1: Write failing tests**

```java
@Test
void markObjectStaleSetsFlagToTrue() {
    UUID objectId = seedObjectWithSummary();
    staleMarkingService.markObjectStale(objectId);
    String isStale = jdbcTemplate.queryForObject(
        "SELECT is_stale FROM summaries WHERE object_id = ?", String.class, objectId);
    assertThat(isStale).isEqualTo("TRUE");
}
```

- [ ] **Step 2: Run — expect FAIL**
- [ ] **Step 3: Implement `StaleMarkingService`** using targeted `@Query` methods
- [ ] **Step 4: Run — expect PASS**
- [ ] **Step 5: Commit**

```bash
git add backend/src/main/java/com/workload/service/StaleMarkingService.java backend/src/test/
git commit -m "feat: add StaleMarkingService for tracking data staleness"
```

---

## Task 3: Replace synchronous recalculation with stale marking

**Files:**
- Modify: all service classes that currently call the calculation service directly

**Per the §6.10 invalidation table — replace each synchronous recalculation call with stale marking:**

| Service method | Old behaviour | New behaviour |
|---|---|---|
| Object equipment/assignment write | `calculationService.recalculate(objectId)` | `staleMarkingService.markObjectStale(objectId)` |
| Records/repairs/travel write | same | same |
| Normative context update | recalculate all affected objects | `staleMarkingService.markAllContextObjects(contextId)` |
| Repair type update | same | `staleMarkingService.markAllRepairTypeObjects(repairTypeId)` |
| Engineer assignment add/remove | recalculate engineers | `staleMarkingService.markEngineerSummaryStaleFroObject(objectId)` |
| `capacityFte` change | recalculate engineer | `staleMarkingService.markEngineerStale(engineerId)` |

Add PoC comment at each removed call site:
```java
// PoC (S-02): synchronous recalculation removed. Staleness now marked here; background worker recalculates on demand.
```

- [ ] **Step 1: Write AC-20 test**

```java
@Test
void ac20NormativeUpdateMarksStalewithoutChangingCurrentValues() {
    // PUT /catalog/devices/:id/contexts/:cid with new R1 minutes
    // GET /svod — verify is_stale = 'TRUE' for affected objects
    // Verify FTE values unchanged (still show old calculation)
}
```

- [ ] **Step 2: Run — expect FAIL**
- [ ] **Step 3: Migrate all synchronous calls to stale-marking across service layer**
- [ ] **Step 4: Run tests — expect PASS**
- [ ] **Step 5: Commit**

```bash
git add backend/src/main/java/com/workload/service/
git commit -m "feat: replace synchronous recalculation with stale marking (reverses S-02)"
```

---

## Task 4: Redis integration and background worker

**Files:**
- Modify: `backend/pom.xml` — add `spring-boot-starter-data-redis`, `spring-boot-starter-batch` or Jedis
- Create: `backend/src/main/java/com/workload/service/RecalculationWorker.java`
- Modify: `backend/src/main/resources/application.properties` — add `spring.redis.*` config
- Modify: `docker-compose.poc.yml` — add Redis service

**Worker design (§17):**
1. Claim batch: `UPDATE summaries SET is_stale = 'PROCESSING' WHERE is_stale = 'TRUE' LIMIT 100 RETURNING object_id` (atomically claims 100 rows)
2. For each `object_id` in batch: run `calculationService.recalculate(objectId)`, then set `is_stale = 'FALSE'`
3. On failure: set `is_stale = 'TRUE'` (un-claim)
4. Use `REPEATABLE READ` isolation for batch transaction

- [ ] **Step 1: Write failing test**

```java
@Test
void workerProcessesStaleSummaries() {
    // Mark 3 objects stale
    // Trigger recalculation worker
    // Verify is_stale = 'FALSE' for all 3 after completion
    // Verify FTE values updated
}
```

- [ ] **Step 2: Add Redis dependency and config**
- [ ] **Step 3: Implement `RecalculationWorker`**
- [ ] **Step 4: Add Redis to `docker-compose.poc.yml`**
- [ ] **Step 5: Run test — expect PASS**
- [ ] **Step 6: Commit**

```bash
git add backend/src/main/java/com/workload/service/RecalculationWorker.java backend/pom.xml docker-compose.poc.yml
git commit -m "feat: add Redis background recalculation worker with PROCESSING state batch claiming"
```

---

## Task 5: `POST /svod/recalculate` admin endpoint

**Files:**
- Modify: `backend/src/main/java/com/workload/controller/SvodController.java`
- Create: `backend/src/test/java/com/workload/controller/RecalculateIT.java`

**Endpoints:**
- `POST /svod/recalculate` — admin only. Enqueues background job. Returns 202 with `{ message: "Recalculation started" }`
- `POST /svod/recalculate/:objectId` — admin only. Triggers single-object recalculation synchronously. Returns 200 with updated summary.
- `GET /svod/recalculate/status` — admin only. Returns `{ totalStale, processed, remaining }`

- [ ] **Step 1: Write failing integration tests**

```java
@Test
void postRecalculateReturns202ForAdmin() {
    // mark some objects stale
    given().auth().oauth2(adminToken)
        .post("/svod/recalculate")
        .then().statusCode(202);
}

@Test
void postRecalculateReturns403ForViewer() {
    given().auth().oauth2(viewerToken)
        .post("/svod/recalculate")
        .then().statusCode(403);
}
```

- [ ] **Step 2: Implement endpoints**
- [ ] **Step 3: Run — expect PASS**
- [ ] **Step 4: Verify AC-10 (bulk recalculation under 60 seconds)** — load test with 2935 objects
- [ ] **Step 5: Commit**

```bash
git add backend/src/main/java/com/workload/controller/SvodController.java backend/src/test/
git commit -m "feat: add POST/GET /svod/recalculate endpoints (admin only, background worker)"
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
git push -u origin feature/mvp-m06-background-backend
```

---

## Final Scope Checklist

- [ ] `is_stale VARCHAR(20)` added to `summaries` via Liquibase v1.2.0
- [ ] `is_stale VARCHAR(20)` added to `engineer_summaries` via Liquibase v1.2.0
- [ ] Partial indexes on `is_stale = 'TRUE'` and `'PROCESSING'` for both tables
- [ ] `StaleMarkingService` with all invalidation trigger methods
- [ ] All synchronous recalculation calls replaced with stale-marking (S-02 reversed)
- [ ] Redis added to dependencies and docker-compose
- [ ] Background worker claims batches with PROCESSING state, REPEATABLE READ isolation
- [ ] `POST /svod/recalculate` — admin only, 202 response, enqueues worker
- [ ] `POST /svod/recalculate/:objectId` — admin only, synchronous single-object
- [ ] `GET /svod/recalculate/status` — admin only
- [ ] AC-10: bulk recalculation under 60 seconds
- [ ] AC-17: engineer summaries marked stale when engineer assignment changes
- [ ] AC-20: normative update marks stale without changing displayed values
- [ ] `mvn verify` passes

## References

- `docs/impl/epics/mvp-m06-background.md`
- `docs/TOR_Workload_WebApp.md §6.10, §17`
- `docs/impl/api-spec.md §"Background recalculation"`
