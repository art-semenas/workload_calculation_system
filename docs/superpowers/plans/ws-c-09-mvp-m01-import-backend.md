# WS-C Step 9 — MVP M-01: JSON Bulk Import Backend

> **For agentic workers:** Use `superpowers:executing-plans` to implement this plan task-by-task.

**Goal:** Reverse PoC simplification S-06. Implement the two-step stateless JSON import flow: `POST /import/data` (dry-run, no writes) and `POST /import/data/confirm` (execute all writes atomically). Handle the full import payload including division/branch/object dedup, equipment upsert with first-occurrence rule, engineer name resolution, and placeholder account creation.

**Branch:** `feature/mvp-m01-import-backend`
**Depends on:** `feature/mvp-m07-periods-backend` merged to `feature/implementation` (import requires active period)
**Phase:** MVP
**Epic:** `docs/impl/epics/mvp-m01-import.md`

---

## Source-Of-Truth Alignment

1. `docs/impl/epics/mvp-m01-import.md` — full scope, processing steps, payload structure, ACs
2. `docs/TOR_Workload_WebApp.md §11.1` — import flow spec, engineer name resolution rules
3. `docs/impl/api-spec.md §"Import Endpoints"` — endpoint contracts
4. `CONTRIBUTING.md` — TDD required; `mvn verify` must pass

**PoC simplification being reversed:**
- S-06: Bulk import not available in PoC. This milestone adds `POST /import/data` and `POST /import/data/confirm`.

**Dependencies at runtime:**
- Requires active planning period (`period_id = activePeriod.id`). Returns 422 if no period active.
- Import is admin-only (enforced by RBAC from M-02).

---

## Task 0: Create feature branch

- [ ] **Step 1:**

```bash
git checkout feature/implementation
git pull origin feature/implementation
git checkout -b feature/mvp-m01-import-backend
```

---

## Task 1: Import payload DTOs

**Files:**
- Create: `backend/src/main/java/com/workload/dto/import_/ImportPayloadDto.java`
- Create: `backend/src/main/java/com/workload/dto/import_/ImportPreviewDto.java`

**Payload structure (from TOR §11.1):**

```java
public record ImportPayloadDto(
    List<DeviceTypeImportDto> deviceTypes,
    List<DeviceContextImportDto> deviceSystemContexts,
    List<RepairTypeImportDto> repairTypes,
    List<ObjectImportDto> objects
) {}

public record ObjectImportDto(
    Integer number,
    String division,
    String branch,
    String name,
    String engineerName,
    List<EquipmentImportDto> equipment,
    RecordsImportDto records,
    Map<String, Integer> repairs,
    TravelImportDto travel
) {}

public record ImportPreviewDto(
    int objectsValid,
    List<String> warnings,
    List<ImportSkippedEntry> skipped,
    int estimatedPlaceholders
) {}
```

- [ ] **Step 1: Create all import DTOs with Jackson annotations**
- [ ] **Step 2: Commit**

```bash
git add backend/src/main/java/com/workload/dto/import_/
git commit -m "feat: add import payload and preview DTOs"
```

---

## Task 2: `ImportValidationService` — dry-run logic

**Files:**
- Create: `backend/src/main/java/com/workload/service/ImportValidationService.java`
- Create: `backend/src/test/java/com/workload/service/ImportValidationServiceTest.java`

**Responsibilities:**
- Validate entire payload without writing to the database
- Returns `ImportPreviewDto`:
  - `objectsValid` — count of objects that would succeed
  - `warnings` — unresolved engineer names, unknown device types (non-fatal)
  - `skipped` — per-entry fatal validation errors
  - `estimatedPlaceholders` — count of new placeholder accounts that would be created

- [ ] **Step 1: Write failing tests**

```java
@Test
void validPayloadReturnsCorrectObjectCount() {
    ImportPayloadDto payload = loadTestPayload("3-objects.json");
    ImportPreviewDto preview = importValidationService.validate(payload);
    assertThat(preview.objectsValid()).isEqualTo(3);
    assertThat(preview.skipped()).isEmpty();
}

@Test
void unknownEngineerNameProducesWarning() {
    ImportPayloadDto payload = payloadWithEngineerName("Неизвестный Инженер");
    ImportPreviewDto preview = importValidationService.validate(payload);
    assertThat(preview.warnings()).anyMatch(w -> w.contains("Неизвестный Инженер"));
    assertThat(preview.estimatedPlaceholders()).isEqualTo(1);
}

@Test
void missingRequiredFieldProducesSkipped() {
    ImportPayloadDto payload = payloadWithObjectMissingName();
    ImportPreviewDto preview = importValidationService.validate(payload);
    assertThat(preview.skipped()).isNotEmpty();
    assertThat(preview.objectsValid()).isEqualTo(0);
}
```

- [ ] **Step 2: Run — expect FAIL**
- [ ] **Step 3: Implement `ImportValidationService`**
- [ ] **Step 4: Run — expect PASS**
- [ ] **Step 5: Commit**

```bash
git add backend/src/main/java/com/workload/service/ImportValidationService.java backend/src/test/
git commit -m "feat: add ImportValidationService for dry-run payload validation"
```

---

## Task 3: `ImportExecutionService` — write logic

**Files:**
- Create: `backend/src/main/java/com/workload/service/ImportExecutionService.java`
- Create: `backend/src/test/java/com/workload/service/ImportExecutionServiceTest.java`

**Processing steps (§11.1, executed in a single `@Transactional` block):**

1. Upsert `device_types` by name
2. Upsert `device_system_contexts` by (deviceTypeName, systemType)
3. Upsert `repair_types` by name
4. For each object:
   a. Dedup/create Division (upsert by name)
   b. Dedup/create Branch (upsert by division_id + name)
   c. Create Object (with `importSeqNo = entry.number`)
   d. For each equipment entry: resolve device type; upsert `object_devices` — **first occurrence sets `quantity_physical`; skip `object_devices` row for subsequent entries for the same device** (only `object_system_assignments` rows created for duplicates)
   e. Create `records_tasks` with `period_id = activePeriod.id`
   f. Create `object_repairs` for non-zero counts with `period_id = activePeriod.id`
   g. Create `travel` row
   h. Engineer resolution: match `engineerName` to existing `users.name`; if not found, create placeholder (`is_active=true`, `requires_activation=true`, `role=engineer`); create `object_engineers` row
5. Mark all imported object summaries stale (`staleMarkingService.markObjectStale(objectId)`)
6. Return import result report

- [ ] **Step 1: Write failing tests**

```java
@Test
void importCreates3ObjectsFromPayload() {
    activatePeriod("H1 2025");
    ImportPayloadDto payload = load3ObjectPayload();
    ImportResultDto result = importExecutionService.execute(payload);
    assertThat(result.objectsImported()).isEqualTo(3);
    assertThat(objectRepository.count()).isEqualTo(3);
}

@Test
void firstEquipmentOccurrenceSetsQuantityPhysical() {
    // two equipment entries for same device on same object
    // verify object_devices.quantity_physical = first occurrence quantity
    // verify two object_system_assignments rows (one per systemType)
}

@Test
void unresolvedEngineerCreatesPlaceholderAccount() {
    activatePeriod("H1 2025");
    ImportPayloadDto payload = payloadWithEngineerName("Placeholder Engineer");
    importExecutionService.execute(payload);
    Optional<User> placeholder = userRepository.findByName("Placeholder Engineer");
    assertThat(placeholder).isPresent();
    assertThat(placeholder.get().isRequiresActivation()).isTrue();
}

@Test
void importReturns422WhenNoActivePeriod() {
    // deactivate all periods
    assertThatThrownBy(() -> importExecutionService.execute(validPayload()))
        .isInstanceOf(NoActivePeriodException.class);
}
```

- [ ] **Step 2: Run — expect FAIL**
- [ ] **Step 3: Implement `ImportExecutionService`**
- [ ] **Step 4: Run — expect PASS**
- [ ] **Step 5: Commit**

```bash
git add backend/src/main/java/com/workload/service/ImportExecutionService.java backend/src/test/
git commit -m "feat: add ImportExecutionService with full stateless import processing"
```

---

## Task 4: `ImportController` endpoints

**Files:**
- Create: `backend/src/main/java/com/workload/controller/ImportController.java`
- Create: `backend/src/test/java/com/workload/controller/ImportControllerIT.java`

**Endpoints:**
- `POST /import/data` — admin only. Validates payload, returns `ImportPreviewDto`. No writes. HTTP 200.
- `POST /import/data/confirm` — admin only. Re-validates and executes. Returns `ImportResultDto`. HTTP 201.

Both endpoints accept `Content-Type: application/json` with the full import payload.

AC-21: import resolves engineer names and creates placeholders; report lists matched, created, and objects with no engineer.

- [ ] **Step 1: Write failing integration tests**

```java
@Test
void dryRunReturnsPreviewWithoutWriting() {
    long countBefore = objectRepository.count();
    given().auth().oauth2(adminToken)
        .body(validPayload())
        .contentType(ContentType.JSON)
        .post("/import/data")
        .then().statusCode(200)
        .body("data.objectsValid", greaterThan(0));
    assertThat(objectRepository.count()).isEqualTo(countBefore); // no writes
}

@Test
void confirmImportWritesAllObjects() {
    activatePeriod("H1 2025");
    given().auth().oauth2(adminToken)
        .body(validPayload())
        .contentType(ContentType.JSON)
        .post("/import/data/confirm")
        .then().statusCode(201)
        .body("data.objectsImported", greaterThan(0));
}

@Test
void importReturns403ForNonAdmin() {
    given().auth().oauth2(editorToken)
        .body(validPayload())
        .contentType(ContentType.JSON)
        .post("/import/data")
        .then().statusCode(403);
}
```

- [ ] **Step 2: Implement `ImportController`**
- [ ] **Step 3: Run tests — expect PASS**
- [ ] **Step 4: Commit**

```bash
git add backend/src/main/java/com/workload/controller/ImportController.java backend/src/test/
git commit -m "feat: add POST /import/data (dry-run) and POST /import/data/confirm endpoints"
```

---

## Task 5: AC-01 reference dataset import test

**Files:**
- Create: `backend/src/test/resources/import/reference-dataset-small.json` (sample subset for test)
- Update: `backend/src/test/java/com/workload/controller/ImportControllerIT.java`

AC-01 requires 2,935 objects from the reference XLSX. The full reference test runs against the actual converted JSON and verifies object count.

- [ ] **Step 1: Create representative subset (50 objects) for CI**

```java
@Test
void referenceSubsetImportProducesCorrectObjectCount() {
    activatePeriod("H1 2025");
    ImportPayloadDto payload = loadResource("import/reference-dataset-small.json");
    ImportResultDto result = importExecutionService.execute(payload);
    assertThat(result.objectsImported()).isEqualTo(50); // subset count
    // verify no objects skipped
    assertThat(result.skipped()).isEmpty();
}
```

- [ ] **Step 2: Run test — expect PASS**
- [ ] **Step 3: Commit**

```bash
git add backend/src/test/resources/import/ backend/src/test/
git commit -m "test: add reference subset import test for AC-01 validation"
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
git push -u origin feature/mvp-m01-import-backend
```

---

## Final Scope Checklist

- [ ] `ImportPayloadDto` with all nested DTOs matching §11.1 payload structure
- [ ] `ImportValidationService.validate()` returns preview without writing
- [ ] `ImportExecutionService.execute()` processes all 10 steps atomically
- [ ] First-occurrence rule for `object_devices.quantity_physical` enforced
- [ ] Engineer name resolution: match existing → create placeholder with `requires_activation=true`
- [ ] `records_tasks` and `object_repairs` rows created with `period_id = activePeriod.id`
- [ ] Returns 422 if no active period
- [ ] `POST /import/data` — admin only, dry-run, no writes
- [ ] `POST /import/data/confirm` — admin only, executes all writes atomically
- [ ] Both endpoints return 403 for non-admin callers
- [ ] AC-21: import report lists matched, created placeholders, and objects with no engineer name
- [ ] All imported objects marked stale for recalculation
- [ ] `mvn verify` passes

## References

- `docs/impl/epics/mvp-m01-import.md`
- `docs/TOR_Workload_WebApp.md §11.1`
- `docs/impl/api-spec.md §"Import Endpoints"`
