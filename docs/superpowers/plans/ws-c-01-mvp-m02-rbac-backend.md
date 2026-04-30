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

- [ ] **Step 1:**

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

- [ ] **Step 1: Write failing migration test**

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

- [ ] **Step 2: Run — expect FAIL**
- [ ] **Step 3: Create migration changeset v1.1.0-1**

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

- [ ] **Step 4: Run — expect PASS**
- [ ] **Step 5: Update `User` entity** to add `failedLoginCount` and `lockedUntil` fields
- [ ] **Step 6: Commit**

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

- [ ] **Step 1: Write failing test**

```java
@Test
void refreshTokenReturnsNewAccessToken() {
    // Login to get cookies
    // Call POST /auth/refresh with refresh token cookie
    // Verify new access token returned
    // Verify refresh token cookie renewed
}
```

- [ ] **Step 2: Run — expect FAIL**
- [ ] **Step 3: Implement refresh token in `JwtTokenProvider`**

Add `generateRefreshToken(User user)` → 7-day expiry.
Add `getEmailFromRefreshToken(String token)`.
Add `isValidRefreshToken(String token)`.

- [ ] **Step 4: Update `AuthController`**

- `POST /auth/login` — returns access token in body + refresh token as HTTP-only `Set-Cookie`
- `POST /auth/refresh` — reads refresh token from cookie, validates, returns new access token + renewed cookie
- `POST /auth/logout` — clears refresh cookie (same-site strict, path=`/api/v1/auth`)

- [ ] **Step 5: Run test — expect PASS**
- [ ] **Step 6: Commit**

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

- [ ] **Step 1: Write failing tests**

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

- [ ] **Step 2: Run — expect FAIL**
- [ ] **Step 3: Implement lockout logic in `AuthController.login()`**

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

- [ ] **Step 4: Run tests — expect PASS**
- [ ] **Step 5: Commit**

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
| `GET` (all reads) | ✓ | ✓ | ✓ (own row for `/engineers`) | ✓ |

- [ ] **Step 1: Write failing AC-08 test**

```java
@Test
void editorCannotWriteObjectsInOtherDivision() {
    // Create editor user assigned to division A
    // Try to PUT /objects/:id for an object in division B
    // Expect HTTP 403
}
```

- [ ] **Step 2: Run — expect FAIL** (currently returns 200 due to S-04)
- [ ] **Step 3: Implement `RbacService`**

```java
public void requireAdminOrEditor(Principal principal, UUID targetDivisionId) {
    User user = userRepository.findByEmail(principal.getName()).orElseThrow();
    if (user.getRole() == Role.ADMIN) return;
    if (user.getRole() == Role.EDITOR && targetDivisionId.equals(user.getDivisionId())) return;
    throw new AccessDeniedException("You don't have permission to modify this resource");
}
```

- [ ] **Step 4: Add `@PreAuthorize` or service-level checks to controllers**
- [ ] **Step 5: Add `@EnableMethodSecurity` to `SecurityConfig`**
- [ ] **Step 6: Run tests — expect PASS**
- [ ] **Step 7: Commit**

```bash
git add backend/src/main/java/com/workload/security/RbacService.java backend/src/main/java/com/workload/config/SecurityConfig.java backend/src/main/java/com/workload/controller/
git commit -m "feat: enforce RBAC on all endpoints — admin/editor/engineer/viewer roles (TOR §12)"
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

- [ ] **Step 1: Write failing tests**
- [ ] **Step 2: Implement with guard checks**
- [ ] **Step 3: Run tests — expect PASS**
- [ ] **Step 4: Commit**

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

- [ ] **Step 1: Write failing integration tests**
- [ ] **Step 2: Implement `AdminUserService` and `AdminUserController`**
- [ ] **Step 3: Run tests — expect PASS**
- [ ] **Step 4: Commit**

```bash
git add backend/src/main/java/com/workload/controller/AdminUserController.java backend/src/main/java/com/workload/service/AdminUserService.java backend/src/test/java/com/workload/controller/AdminUserControllerIT.java
git commit -m "feat: add /admin/users management endpoints (admin only)"
```

---

## Task 7: Run full backend quality gates

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
git push -u origin feature/mvp-m02-rbac-backend
```

---

## Final Scope Checklist

- [ ] `failed_login_count` and `locked_until` columns migrated via Liquibase v1.1.0
- [ ] JWT refresh token flow working (15min access + 7-day refresh in HTTP-only cookie)
- [ ] Account locks after 5 failed attempts, unlocks after 30 minutes
- [ ] RBAC enforced: admin unrestricted, editor own-division, engineer read-only, viewer read-only
- [ ] `GET /engineers` returns only own row for engineer role
- [ ] `DELETE /divisions/:id` admin only, blocked if branches exist
- [ ] `DELETE /branches/:id` admin only, blocked if objects exist
- [ ] `/admin/users` CRUD endpoints (admin only)
- [ ] `PUT /admin/users/:id/activate` activates placeholder accounts
- [ ] AC-08 verified: editor gets 403 on other-division objects
- [ ] `mvn verify` passes

## References

- `docs/impl/epics/mvp-m02-auth.md`
- `docs/TOR_Workload_WebApp.md §12, §21`
- `docs/impl/api-spec.md §"User Administration"`
