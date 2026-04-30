# WS-C Step 3 — MVP M-04/M-05: Catalog Management Backend

> **For agentic workers:** Use `superpowers:executing-plans` to implement this plan task-by-task.

**Goal:** Unlock admin write access to the device and repair type catalogs. Add `POST/PUT/DELETE /catalog/devices`, `POST/PUT/DELETE /catalog/devices/:id/contexts`, and `POST/PUT/DELETE /catalog/repairs` endpoints — all admin-only. Enforce FK guards on delete (HTTP 409 when context or repair type is in use). No schema migrations required (catalog tables already exist from PoC seed).

**Branch:** `feature/mvp-m04-m05-catalog-backend`
**Depends on:** `feature/mvp-m02-rbac-backend` merged to `feature/implementation`
**Phase:** MVP
**Epic:** `docs/impl/epics/mvp-m04-m05-engineers-catalog.md`

---

## Source-Of-Truth Alignment

1. `docs/impl/epics/mvp-m04-m05-engineers-catalog.md` — scope, ACs, API endpoints
2. `docs/TOR_Workload_WebApp.md §4.2, §4.5` — device catalog and repair type rules
3. `docs/impl/api-spec.md` — endpoint semantics and error codes
4. `CONTRIBUTING.md` — TDD required; `mvn verify` must pass

**PoC simplification being reversed:**
- S-03: Catalog was seed-only (read-only). This milestone adds admin write endpoints.

---

## Task 0: Create feature branch

- [ ] **Step 1:**

```bash
git checkout feature/implementation
git pull origin feature/implementation
git checkout -b feature/mvp-m04-m05-catalog-backend
```

---

## Task 1: `POST /catalog/devices` and `PUT /catalog/devices/:id`

**Files:**
- Modify: `backend/src/main/java/com/workload/controller/CatalogController.java`
- Modify: `backend/src/main/java/com/workload/service/CatalogService.java`
- Modify: `backend/src/test/java/com/workload/controller/CatalogControllerIT.java`

**Spec:**
- `POST /catalog/devices` — admin only. Body: `{ name, description? }`. Returns 201 with created `DeviceTypeDto`. Returns 409 if name already exists.
- `PUT /catalog/devices/:id` — admin only. Body: `{ name?, description? }`. Returns 200 with updated dto. Returns 409 on name conflict.

- [ ] **Step 1: Write failing tests**

```java
@Test
void createDeviceTypeReturns201() {
    given().auth().oauth2(adminToken)
        .body(Map.of("name", "New Device"))
        .contentType(ContentType.JSON)
        .post("/catalog/devices")
        .then().statusCode(201)
        .body("data.name", equalTo("New Device"));
}

@Test
void createDeviceTypeReturns409OnDuplicate() {
    // create twice with same name
    // second call returns 409
}

@Test
void createDeviceTypeReturns403ForNonAdmin() {
    given().auth().oauth2(editorToken)
        .body(Map.of("name", "New Device"))
        .contentType(ContentType.JSON)
        .post("/catalog/devices")
        .then().statusCode(403);
}
```

- [ ] **Step 2: Run — expect FAIL**
- [ ] **Step 3: Implement in `CatalogService` and `CatalogController`**
- [ ] **Step 4: Run — expect PASS**
- [ ] **Step 5: Commit**

```bash
git add backend/src/main/java/com/workload/
git commit -m "feat: add POST/PUT /catalog/devices admin endpoints"
```

---

## Task 2: `DELETE /catalog/devices/:id`

**Spec:**
- Admin only. Returns 204 on success. Returns 409 with message "Cannot delete: device type is assigned to {N} objects" if any `object_devices` rows reference this device type. Database FK `ON DELETE RESTRICT` prevents bypass.

- [ ] **Step 1: Write failing tests**

```java
@Test
void deleteDeviceTypeReturns204WhenUnused() {
    UUID id = createDevice("Unused Device");
    given().auth().oauth2(adminToken)
        .delete("/catalog/devices/" + id)
        .then().statusCode(204);
}

@Test
void deleteDeviceTypeReturns409WhenInUse() {
    UUID id = deviceTypeWithObjectAssignment();
    given().auth().oauth2(adminToken)
        .delete("/catalog/devices/" + id)
        .then().statusCode(409)
        .body("error.code", equalTo(409));
}
```

- [ ] **Step 2: Implement with FK guard check**

```java
public void deleteDeviceType(UUID id) {
    long usageCount = objectDeviceRepository.countByDeviceTypeId(id);
    if (usageCount > 0) {
        throw new ContextInUseException((int) usageCount);
    }
    deviceTypeRepository.deleteById(id);
}
```

- [ ] **Step 3: Run — expect PASS**
- [ ] **Step 4: Commit**

```bash
git commit -m "feat: add DELETE /catalog/devices/:id with FK guard (admin only)"
```

---

## Task 3: `POST/PUT/DELETE /catalog/devices/:id/contexts`

**Files:**
- Modify: `backend/src/main/java/com/workload/service/CatalogService.java`
- Modify: `backend/src/main/java/com/workload/controller/CatalogController.java`

**Spec:**
- `POST /catalog/devices/:id/contexts` — admin only. Body: `{ systemType, r1Minutes, r2Minutes }`. Returns 201. Returns 409 if (deviceId, systemType) context already exists.
- `PUT /catalog/devices/:id/contexts/:cid` — admin only. Body: `{ r1Minutes?, r2Minutes? }`. Returns 200. **Note (PoC S-02):** In this milestone (before M-06), updating normatives still triggers synchronous recalculation on all affected objects. Add comment: `// PoC (S-02): synchronous recalculation. Replaced by is_stale marking in MVP M-06.`
- `DELETE /catalog/devices/:id/contexts/:cid` — admin only. Returns 409 `"Cannot delete: context is in use by {N} objects"` if any `object_system_assignments` references this context.

AC-05: "Assign to system" dropdown must only show systems with a valid context row. API rejects invalid assignments with HTTP 422.
AC-06: `DELETE` returns 409 listing affected objects when any `object_system_assignments` references the context.

- [ ] **Step 1: Write failing tests for all three endpoints**

```java
@Test
void addContextReturns201() {
    UUID deviceId = existingDeviceId();
    given().auth().oauth2(adminToken)
        .body(Map.of("systemType", "OS", "r1Minutes", 10.0, "r2Minutes", 5.0))
        .post("/catalog/devices/" + deviceId + "/contexts")
        .then().statusCode(201)
        .body("data.systemType", equalTo("OS"));
}

@Test
void deleteContextReturns409WhenInUse() {
    UUID cid = contextWithActiveAssignments();
    given().auth().oauth2(adminToken)
        .delete("/catalog/devices/{id}/contexts/" + cid, deviceId)
        .then().statusCode(409);
}
```

- [ ] **Step 2: Implement all three endpoints**
- [ ] **Step 3: Run — expect PASS**
- [ ] **Step 4: Commit**

```bash
git commit -m "feat: add POST/PUT/DELETE /catalog/devices/:id/contexts (admin only)"
```

---

## Task 4: `POST/PUT/DELETE /catalog/repairs`

**Files:**
- Modify: `backend/src/main/java/com/workload/service/CatalogService.java`
- Modify: `backend/src/main/java/com/workload/controller/CatalogController.java`
- Update: `backend/src/test/java/com/workload/controller/CatalogControllerIT.java`

**Spec:**
- `POST /catalog/repairs` — admin only. Body: `{ name, timeMinutes }`. Returns 201. Returns 409 if name already exists.
- `PUT /catalog/repairs/:id` — admin only. Body: `{ name?, timeMinutes? }`. Returns 200. **Note (S-02):** synchronous recalculation still applies. Add `// PoC (S-02): synchronous recalculation. Replaced by is_stale marking in MVP M-06.`
- `DELETE /catalog/repairs/:id` — admin only. Returns 409 `"Cannot delete: repair type is in use"` if any `object_repairs` row references this type with `count > 0`.

- [ ] **Step 1: Write failing tests**

```java
@Test
void createRepairTypeReturns201() { ... }

@Test
void deleteRepairTypeReturns409WhenInUse() {
    UUID id = repairTypeWithNonZeroCount();
    given().auth().oauth2(adminToken)
        .delete("/catalog/repairs/" + id)
        .then().statusCode(409);
}
```

- [ ] **Step 2: Implement**
- [ ] **Step 3: Run — expect PASS**
- [ ] **Step 4: Commit**

```bash
git commit -m "feat: add POST/PUT/DELETE /catalog/repairs (admin only)"
```

---

## Task 5: Verify AC-04, AC-05, AC-06

- [ ] **Step 1: Write AC-04 integration test**

```java
@Test
void ac04AdminCreatesDeviceTypeAndAssignsToObject() {
    // Create device type
    // Create system context with R1/R2
    // Assign to object with quantityMaintained
    // Trigger recalculation
    // GET /svod — verify object appears in СВОД with correct FTE
}
```

- [ ] **Step 2: Write AC-05 test**

```java
@Test
void ac05AssignmentDropdownOnlyShowsValidContexts() {
    // POST /objects/:id/assignments with systemType having no context
    // Verify HTTP 422
}
```

- [ ] **Step 3: Run both tests — expect PASS**
- [ ] **Step 4: Commit**

```bash
git commit -m "test: verify AC-04 and AC-05 for catalog write endpoints"
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
git push -u origin feature/mvp-m04-m05-catalog-backend
```

---

## Final Scope Checklist

- [ ] `POST /catalog/devices` — admin only, 409 on duplicate name
- [ ] `PUT /catalog/devices/:id` — admin only
- [ ] `DELETE /catalog/devices/:id` — admin only, 409 if `object_devices` references exist
- [ ] `POST /catalog/devices/:id/contexts` — admin only, 409 on duplicate (device, systemType)
- [ ] `PUT /catalog/devices/:id/contexts/:cid` — admin only, synchronous recalculation (S-02 comment)
- [ ] `DELETE /catalog/devices/:id/contexts/:cid` — admin only, 409 if `object_system_assignments` references exist (AC-06)
- [ ] `POST /catalog/repairs` — admin only, 409 on duplicate name
- [ ] `PUT /catalog/repairs/:id` — admin only, synchronous recalculation (S-02 comment)
- [ ] `DELETE /catalog/repairs/:id` — admin only, 409 if `object_repairs.count > 0`
- [ ] AC-04 integration test passes
- [ ] AC-05 API validation test passes
- [ ] All endpoints return 403 for non-admin callers
- [ ] `mvn verify` passes

## References

- `docs/impl/epics/mvp-m04-m05-engineers-catalog.md`
- `docs/TOR_Workload_WebApp.md §4.2, §4.5`
- `docs/impl/api-spec.md §"Catalog management endpoints"`
