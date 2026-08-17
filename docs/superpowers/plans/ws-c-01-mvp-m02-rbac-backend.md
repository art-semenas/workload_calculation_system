# WS-C Step 1 — MVP M-02: RBAC Backend

> **For agentic workers:** Use `superpowers:executing-plans` to implement this plan task-by-task.

**Goal:** Implement full RBAC enforcement: JWT access + refresh token pair, account lockout (5 failed attempts → 30 min lock), division-scoped editor access, `DELETE /divisions/:id` and `DELETE /branches/:id`, `/admin/users` management endpoints, and role enforcement on all existing PoC endpoints. Resolves S-04.

**Branch:** `feature/mvp-m02-rbac-backend`
**Depends on:** `feature/implementation` (PoC M-03 + error handling merged)
**Phase:** MVP
**Epic:** `docs/impl/epics/mvp-m02-auth.md`

---

## Source-Of-Truth Alignment

1. `docs/impl/epics/mvp-m02-auth.md` — scope, ACs, API endpoints
2. `docs/TOR_Workload_WebApp.md §12` — role definitions and access rules
3. `docs/TOR_Workload_WebApp.md §21` — JWT flow, token lifetimes, lockout rules
4. `docs/impl/api-spec.md` — endpoint semantics
5. `docs/impl/db-schema.md` — MVP-only `users` columns (`failed_login_count`, `locked_until`)

**RBAC roles (TOR §12):**
- `admin` — unrestricted read/write on everything
- `editor` — read/write on objects in their assigned division only
- `engineer` — read-only on own data; can update own records/repairs
- `viewer` — read-only everywhere

**PoC simplifications being reversed:**
- S-04: All authenticated users could read/write. Now enforced per role.

---

## Task 0: Create feature branch

- [x] **Step 1:**

```bash
git checkout feature/implementation
git pull origin feature/implementation
git checkout -b feature/mvp-m02-rbac-backend
```

---

## Task 1: Add MVP-only `users` columns via Liquibase migration

**Files:**
- Create: `backend/src/main/resources/db/changelog/changes/v1.1.0-mvp-m02-users.xml`
- Update: `backend/src/main/resources/db/changelog/db.changelog-master.xml`

**New columns (from `docs/impl/db-schema.md` — MVP-only section):**
- `failed_login_count INTEGER NOT NULL DEFAULT 0`
- `locked_until TIMESTAMP NULL`

- [x] **Step 1: Write failing migration test**

```java
@Test
void mvpUsersColumnsExist() {
    // Assert failed_login_count and locked_until columns exist on users table
    Integer count = jdbcTemplate.queryForObject(
        "SELECT COUNT(*) FROM information_schema.columns " +
        "WHERE table_name='users' AND column_name IN ('failed_login_count','locked_until')",
        Integer.class);
    assertThat(count).isEqualTo(2);
}
```

- [x] **Step 2: Run — expect FAIL**
- [x] **Step 3: Create migration changeset v1.1.0-1**

```xml
<changeSet id="v1.1.0-1" author="dev">
  <addColumn tableName="users">
    <column name="failed_login_count" type="INTEGER" defaultValueNumeric="0">
      <constraints nullable="false"/>
    </column>
    <column name="locked_until" type="TIMESTAMP"/>
  </addColumn>
  <rollback>
    <dropColumn tableName="users" columnName="failed_login_count"/>
    <dropColumn tableName="users" columnName="locked_until"/>
  </rollback>
</changeSet>
```

- [x] **Step 4: Run — expect PASS**
- [x] **Step 5: Update `User` entity** to add `failedLoginCount` and `lockedUntil` fields
- [x] **Step 6: Commit**

```bash
git add backend/src/main/resources/db/changelog/ backend/src/main/java/com/workload/entity/User.java
git commit -m "feat: add MVP users columns failed_login_count and locked_until via Liquibase"
```

---

## Task 2: JWT refresh token implementation

**Files:**
- Modify: `backend/src/main/java/com/workload/security/JwtTokenProvider.java`
- Modify: `backend/src/main/java/com/workload/controller/AuthController.java`
- Modify: `backend/src/main/java/com/workload/dto/LoginResponse.java`
- Update: `backend/src/test/java/com/workload/controller/AuthControllerIT.java`

**Spec (TOR §21.2):**
- Access token: 15-minute lifetime
- Refresh token: 7-day lifetime, stored in HTTP-only cookie
- `POST /auth/refresh` — accepts refresh token from cookie, returns new access + refresh tokens

- [x] **Step 1: Write failing test**

```java
@Test
void refreshTokenReturnsNewAccessToken() {
    // Login to get cookies
    // Call POST /auth/refresh with refresh token cookie
    // Verify new access token returned
    // Verify refresh token cookie renewed
}
```

- [x] **Step 2: Run — expect FAIL**
- [x] **Step 3: Implement refresh token in `JwtTokenProvider`**

Add `generateRefreshToken(User user)` → 7-day expiry.
Add `getEmailFromRefreshToken(String token)`.
Add `isValidRefreshToken(String token)`.

- [x] **Step 4: Update `AuthController`**

- `POST /auth/login` — returns access token in body + refresh token as HTTP-only `Set-Cookie`
- `POST /auth/refresh` — reads refresh token from cookie, validates, returns new access token + renewed cookie
- `POST /auth/logout` — clears refresh cookie (same-site strict, path=`/api/v1/auth`)

- [x] **Step 5: Run test — expect PASS**
- [x] **Step 6: Commit**

```bash
git add backend/src/main/java/com/workload/security/ backend/src/main/java/com/workload/controller/AuthController.java backend/src/main/java/com/workload/dto/LoginResponse.java
git commit -m "feat: add JWT refresh token flow — 15min access + 7-day refresh in HTTP-only cookie"
```

---

## Task 3: Account lockout on failed login

**Files:**
- Modify: `backend/src/main/java/com/workload/controller/AuthController.java`
- Modify: `backend/src/main/java/com/workload/service/UserDetailsServiceImpl.java`
- Create: `backend/src/test/java/com/workload/controller/AuthLockoutIT.java`

**Spec (TOR §21.3):**
- 5 consecutive failures → `locked_until = now() + 30 minutes`
- Failed login increments `failed_login_count`
- Successful login resets `failed_login_count = 0`
- Login attempt while locked → HTTP 401 with message "Account locked. Try again after {time}."

- [x] **Step 1: Write failing tests**

```java
@Test
void accountLocksAfterFiveFailedAttempts() {
    // 5 failed logins with wrong password
    // 6th attempt with CORRECT password
    // Verify 401 with locked message
}

@Test
void successfulLoginResetsFailedCount() {
    // 3 failed attempts
    // 1 successful login
    // Verify failed_login_count = 0 in DB
}
```

- [x] **Step 2: Run — expect FAIL**
- [x] **Step 3: Implement lockout logic in `AuthController.login()`**

```java
// In login handler:
User user = userRepository.findByEmail(email).orElseThrow(...)
// Check if locked
if (user.getLockedUntil() != null && user.getLockedUntil().isAfter(OffsetDateTime.now())) {
    throw new AccountLockedException(user.getLockedUntil());
}
// Verify password
if (!passwordEncoder.matches(password, user.getPasswordHash())) {
    user.setFailedLoginCount(user.getFailedLoginCount() + 1);
    if (user.getFailedLoginCount() >= 5) {
        user.setLockedUntil(OffsetDateTime.now().plusMinutes(30));
    }
    userRepository.save(user);
    throw new InvalidCredentialsException();
}
// Success — reset counter
user.setFailedLoginCount(0);
user.setLockedUntil(null);
userRepository.save(user);
```

- [x] **Step 4: Run tests — expect PASS**
- [x] **Step 5: Commit**

```bash
git add backend/src/main/java/com/workload/controller/AuthController.java backend/src/test/java/com/workload/controller/AuthLockoutIT.java
git commit -m "feat: implement account lockout after 5 failed login attempts (TOR §21.3)"
```

---

## Task 4: RBAC enforcement on existing endpoints

**Files:**
- Create: `backend/src/main/java/com/workload/security/RbacService.java`
- Modify: `backend/src/main/java/com/workload/config/SecurityConfig.java`
- Modify: controllers as needed to add method-level security

**Role rules to enforce (TOR §12):**

| Endpoint group | Admin | Editor | Engineer | Viewer |
|---|---|---|---|---|
| `POST/PUT/DELETE /divisions`, `POST/PUT/DELETE /branches` | ✓ | ✗ | ✗ | ✗ |
| `POST/PUT/DELETE /objects` | ✓ | own division | ✗ | ✗ |
| Equipment/records/repairs/travel write | ✓ | own division | own objects (records/repairs) | ✗ |
| `POST /engineers`, `PUT/DELETE /engineers/:id` | ✓ | ✗ | ✗ | ✗ |
| Engineer assignment writes | ✓ | own division | ✗ | ✗ |
| `GET /engineers` | ✓ all | ✓ all | own row only | ✓ all |
| `GET /objects`, `GET /svod`, exports | ✓ all | ✓ all | **own objects only** | ✓ all |
| `GET` (everything else) | ✓ | ✓ | ✓ | ✓ |

- [x] **Step 1: Write failing AC-08 test**

```java
@Test
void editorCannotWriteObjectsInOtherDivision() {
    // Create editor user assigned to division A
    // Try to PUT /objects/:id for an object in division B
    // Expect HTTP 403
}
```

- [x] **Step 2: Run — expect FAIL** (currently returns 200 due to S-04)
- [x] **Step 3: Implement `RbacService`**

```java
public void requireAdminOrEditor(Principal principal, UUID targetDivisionId) {
    User user = userRepository.findByEmail(principal.getName()).orElseThrow();
    if (user.getRole() == Role.ADMIN) return;
    if (user.getRole() == Role.EDITOR && targetDivisionId.equals(user.getDivisionId())) return;
    throw new AccessDeniedException("You don't have permission to modify this resource");
}
```

- [x] **Step 4: Add `@PreAuthorize` or service-level checks to controllers**
- [x] **Step 5: Add `@EnableMethodSecurity` to `SecurityConfig`**
- [x] **Step 6: Register an `accessDeniedHandler` in `SecurityConfig`**

`AccessDeniedException` thrown by the security **filter chain** (URL-level `authorizeHttpRequests` rules) never reaches `@RestControllerAdvice` — the exception is handled inside the filter chain, before the `DispatcherServlet`. Without a handler, filter-level 403s bypass the `ApiResponse` envelope entirely and the frontend's error parsing gets an empty or Spring-default body.

Register an `accessDeniedHandler` alongside the existing `authenticationEntryPoint`, mirroring its shape, so filter-level 403s return the envelope with `code: 403`:

```java
http.exceptionHandling(exceptions -> exceptions
    .authenticationEntryPoint(authenticationEntryPoint)
    .accessDeniedHandler(accessDeniedHandler));

@Bean
AccessDeniedHandler accessDeniedHandler(ObjectMapper objectMapper) {
  return (request, response, ex) -> {
    response.setStatus(HttpServletResponse.SC_FORBIDDEN);
    response.setContentType(MediaType.APPLICATION_JSON_VALUE);
    ApiResponse<Void> body = ApiResponse.error(
        ApiError.of(HttpStatus.FORBIDDEN, "You don't have permission to access this resource"));
    objectMapper.writeValue(response.getOutputStream(), body);
  };
}
```

The message must match `GlobalExceptionHandler.handleAccessDenied` so method-level and filter-level 403s are indistinguishable to the client. Cover it with an IT that hits a URL-rule-protected route with an insufficient role and asserts `error.code == 403` in the envelope.

- [x] **Step 7: Run tests — expect PASS**
- [x] **Step 8: Commit**

```bash
git add backend/src/main/java/com/workload/security/RbacService.java backend/src/main/java/com/workload/config/SecurityConfig.java backend/src/main/java/com/workload/controller/
git commit -m "feat: enforce RBAC on all endpoints — admin/editor/engineer/viewer roles (TOR §12)"
```

---

## Task 4b: Engineer read scoping — objects and СВОД

> Added after Task 4 was implemented. The role table originally compressed all reads into one
> row, which hid the fact that engineers are scoped on the object side too. Two of these rules
> are **filters returning 200 with fewer rows**, not denials, so tests that only assert 403 will
> pass while the rule is entirely unimplemented — which is how it was missed the first time.

**Files:**
- Modify: `backend/src/main/java/com/workload/service/ObjectService.java`
- Modify: `backend/src/main/java/com/workload/service/SvodService.java`
- Modify: `backend/src/main/java/com/workload/service/XlsxExportService.java` (or its caller)
- Update: `backend/src/test/java/com/workload/controller/RbacIT.java`

**Spec (TOR §12 permission matrix and Engineer scope note):**

| Permission | Admin | Editor | Viewer | Engineer |
|---|---|---|---|---|
| View all objects / СВОД | ✅ | ✅ | ✅ | **Own objects only** |
| Export XLSX / PDF | ✅ | ✅ | ✅ | **✅ (own objects)** |

> "They can view their own `engineer_summaries` and the objects they are assigned to. They cannot
> view other engineers' rows, dashboards, or unassigned objects." — TOR §12

Note this is stricter than "cannot see unassigned objects": an engineer also cannot see objects
assigned to *someone else*. Membership is `object_engineers`, the same table
`RbacService.requireCanEditObjectData` already consults.

- [x] **Step 1: Write failing tests** — an engineer assigned to one object gets exactly that object
      from `GET /objects` and `GET /svod`, while admin/editor/viewer still get the full list. Assert
      **row counts**, not status codes; a denial-only assertion cannot detect a missing filter.
- [x] **Step 2: Run — expect FAIL** (lists currently return every row for every role)
- [x] **Step 3: Filter `GET /objects` and `GET /svod`** to the caller's assigned objects when the
      role is `engineer`. Push the restriction into the repository query rather than filtering the
      result in memory — the seeded dataset is 2,934 objects and `/svod` is paginated, so
      post-filtering a page would return short pages and wrong totals.
- [x] **Step 4: Deny `GET /objects/{id}` and `GET /objects/{id}/summary`** for an object the
      engineer is not assigned to — 403, mirroring `GET /engineers/{id}`. Filtering the list
      achieves nothing while the detail route stays open.
- [x] **Step 5: Scope the СВОД XLSX export** to the same set, so the export cannot be used to read
      around the filter.
- [x] **Step 6: Run tests — expect PASS**
- [x] **Step 7: Commit**

```bash
git commit -m "feat: scope object and SVOD reads to assigned objects for engineers (TOR §12)"
```

---

## Task 5: `DELETE /divisions/:id` and `DELETE /branches/:id`

**Files:**
- Modify: `backend/src/main/java/com/workload/service/DivisionService.java`
- Modify: `backend/src/main/java/com/workload/controller/DivisionController.java`
- Modify: `backend/src/main/java/com/workload/controller/BranchController.java`
- Update: integration tests

**Rules:**
- `DELETE /divisions/:id` — admin only. Returns HTTP 409 with message "Cannot delete: division has branches" if any branches exist.
- `DELETE /branches/:id` — admin only. Returns HTTP 409 with message "Cannot delete: branch has objects" if any objects exist.

- [x] **Step 1: Write failing tests**
- [x] **Step 2: Implement with guard checks**
- [x] **Step 3: Run tests — expect PASS**
- [x] **Step 4: Commit**

```bash
git commit -m "feat: add DELETE /divisions/:id and DELETE /branches/:id with cascade guards (admin only)"
```

---

## Task 6: `/admin/users` management endpoints

**Files:**
- Create: `backend/src/main/java/com/workload/controller/AdminUserController.java`
- Create: `backend/src/main/java/com/workload/service/AdminUserService.java`
- Create: `backend/src/test/java/com/workload/controller/AdminUserControllerIT.java`

**Endpoints (from epic):**
- `GET /admin/users` — list all users, paginated, filterable by `?role=&is_active=`. Admin only.
- `POST /admin/users` — create non-engineer user. Returns 422 if `role=engineer` (use `POST /engineers` for engineers).
- `GET /admin/users/:id` — get user details.
- `PUT /admin/users/:id` — update name, email, role, divisionId.
- `PUT /admin/users/:id/activate` — activate placeholder account (`is_active=true`, `requires_activation=false`).
- `DELETE /admin/users/:id` — deactivate (sets `is_active=false`). Returns 409 if engineer has active object assignments.

- [x] **Step 1: Write failing integration tests**
- [x] **Step 2: Implement `AdminUserService` and `AdminUserController`**
- [x] **Step 3: Run tests — expect PASS**
- [x] **Step 4: Commit**

```bash
git add backend/src/main/java/com/workload/controller/AdminUserController.java backend/src/main/java/com/workload/service/AdminUserService.java backend/src/test/java/com/workload/controller/AdminUserControllerIT.java
git commit -m "feat: add /admin/users management endpoints (admin only)"
```

---

## Task 7: Run full backend quality gates

- [x] **Step 1:**

```bash
cd backend
mvn spotless:apply
mvn verify
```

Expected: `BUILD SUCCESS`.

- [x] **Step 2: Fix any failures**
- [x] **Step 3: Push**

```bash
git push -u origin feature/mvp-m02-rbac-backend
```

---

## Final Scope Checklist

- [x] `failed_login_count` and `locked_until` columns migrated via Liquibase v1.1.0
- [x] JWT refresh token flow working (15min access + 7-day refresh in HTTP-only cookie)
- [x] Account locks after 5 failed attempts, unlocks after 30 minutes
- [x] RBAC enforced: admin unrestricted, editor own-division, engineer read-only, viewer read-only
- [x] `GET /engineers` returns only own row for engineer role
- [x] `GET /objects` and `GET /svod` return only assigned objects for engineer role
- [x] `GET /objects/:id` returns 403 for an object the engineer is not assigned to
- [x] СВОД XLSX export is scoped to the same set for engineer role
- [x] Wider engineer read set closed: `/objects/:id/engineers`, `/engineers/:id/objects`, `/engineers/:id/summary`, `/aggregations/*`, `/coverage/gaps`
- [x] `DELETE /divisions/:id` admin only, blocked if branches exist
- [x] `DELETE /branches/:id` admin only, blocked if objects exist
- [x] `/admin/users` CRUD endpoints (admin only)
- [x] `PUT /admin/users/:id/activate` activates placeholder accounts
- [x] AC-08 verified: editor gets 403 on other-division objects
- [x] `mvn verify` passes — 460 tests, Jacoco thresholds met, SpotBugs clean

## Verification Notes (2026-08-14)

Tasks 0–4 and 5–7 verified against the code on `feature/mvp-m02-rbac-backend`. Task 4b was found
entirely unimplemented at verification time and has since been implemented, together with the wider
endpoint set listed below. All items in the checklist above are now closed; `mvn verify` runs 479
tests green.

Verified present:
- Token lifetimes come from config: `jwt.expiration-ms` 900000 (15 min), `jwt.refresh-expiration-ms`
  604800000 (7 days); refresh cookie is `HttpOnly`, `SameSite=Strict`, `path=/api/v1/auth`.
- Lockout thresholds come from config: `security.lockout.max-attempts` 5,
  `security.lockout.duration-minutes` 30. `AuthService.login` is `@Transactional(noRollbackFor =
  InvalidCredentialsException.class)` so the counter survives the failure it reports.
- Every write endpoint in the Task 4 matrix is guarded — `@PreAuthorize("hasRole('ADMIN')")` on
  divisions/branches/engineers/catalog, `RbacService.requireCanWriteObject` /
  `requireCanWriteInBranch` / `requireCanEditObjectData` on objects, equipment, records, repairs,
  travel and assignments.

Was absent, now implemented (Task 4b, plus the adjacent gaps in the same family):
- `ObjectRepository.findAllEnriched` and `SummaryRepository.findAllScoped` take a nullable
  `engineerId` and narrow via an `EXISTS` subquery over `object_engineers`. `EXISTS` rather than a
  predicate on the existing `LEFT JOIN`, which would otherwise collapse `engineerCount` to 1.
- `RbacService.readScopeEngineerId()` supplies that id — present only for the engineer role — and
  `requireCanReadObject` / `requireCanReadEngineerData` guard the detail routes.
- `/aggregations/*` and `/coverage/gaps` carry `@PreAuthorize("!hasRole('ENGINEER')")`: they are
  organisation-wide rollups, and narrowing one to a single engineer's objects would produce a
  different, misleading number rather than a filtered view.
- Read scoping keys on the **role**, not `is_engineer`, so an engineer who also holds the editor or
  admin role reads everything that role allows. `EngineerReadScopingIT` covers this explicitly.

Coverage: `EngineerReadScopingIT` (19 tests) asserts row counts and membership rather than status
codes alone, per the warning at the top of Task 4b.

## References

- `docs/impl/epics/mvp-m02-auth.md`
- `docs/TOR_Workload_WebApp.md §12, §21`
- `docs/impl/api-spec.md §"User Administration"`
