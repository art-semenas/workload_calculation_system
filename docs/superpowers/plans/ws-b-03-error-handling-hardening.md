# WS-B Step 3 — Error Handling: Backend Hardening + Doc Sweep

> **For agentic workers:** Use `superpowers:executing-plans` to implement this plan task-by-task.

**Goal:** Close the gaps left after ws-b-01 (numeric error codes, merged as PR #14). Backend: the switch from `@ExceptionHandler(RuntimeException.class)` to `@ExceptionHandler(Exception.class)` now swallows Spring MVC's *checked* exceptions that previously fell through to Boot's default handling — wrong-method requests and unknown `/api/...` paths return **500** instead of 405/404 and get logged at ERROR. Also: a dead `ApiError.notFound` factory and a misleading login-failure message. Docs: `CONTRIBUTING.md`, `docs/impl/api-spec.md`, and five spots in the TOR still document the old string-code contract, so future work will reintroduce string codes.

**Branch:** `feature/error-handling-hardening`
**Depends on:** `feature/error-handling-frontend` (ws-b-02) merged to `feature/implementation`
**Workstream:** B — Unified Error Handling

**Scope note:** frontend work is entirely in ws-b-02 — nothing here touches `frontend/`.

---

## Task 0: Create feature branch

Note: local `feature/implementation` was observed 9 commits behind origin (missing the PR #14 merge `c5e9a2e`) — the `git pull` below is load-bearing, verify it fast-forwards.

- [ ] **Step 1:**

```bash
git checkout feature/implementation
git pull origin feature/implementation
git log --oneline -3        # must contain c5e9a2e (Merge PR #14) in history
git checkout -b feature/error-handling-hardening
```

---

## Task 1: Map framework exceptions instead of falling through to 500

**Files:**
- Modify: `backend/src/main/java/com/workload/exception/GlobalExceptionHandler.java`
- Modify: `backend/src/test/java/com/workload/exception/GlobalExceptionHandlerTest.java`

**Target mapping** (all currently caught by the generic `Exception` handler → 500):

| Exception | Status | Message |
|---|---|---|
| `NoResourceFoundException` (`org.springframework.web.servlet.resource`) | 404 | `"Resource not found"` |
| `HttpRequestMethodNotSupportedException` | 405 | `"Method not allowed"` |
| `MissingServletRequestParameterException` | 400 | `"Missing required parameter: {name}"` |
| `MethodArgumentTypeMismatchException` | 400 | `"Invalid value for parameter '{name}'"` |
| `HttpMediaTypeNotSupportedException` | 415 | `"Unsupported media type"` |

- [ ] **Step 1: Write failing tests** — one unit test per row, plus two end-to-end cases (MockMvc or `*IT`) proving the regression is fixed:
  - `GET /api/v1/nonexistent-path` → 404 with `error.code == 404` (currently 500)
  - wrong method on an existing route (e.g. `DELETE /api/v1/divisions`) → 405 with `error.code == 405` (currently 500)

- [ ] **Step 2: Run — expect FAIL**

```bash
cd backend && mvn test -Dtest=GlobalExceptionHandlerTest
```

- [ ] **Step 3: Add the five handlers** in the existing style — `ResponseEntity.status(HttpStatus.*)` + `ApiError.of(HttpStatus.*, ...)`, never hardcoded numbers. Do **not** log these at ERROR: they are client mistakes, not server faults (no logging, or DEBUG at most — keeps the JSON log stream meaningful).

- [ ] **Step 4: Run — expect PASS**

- [ ] **Step 5: Commit**

```bash
git add backend/src/main/java/com/workload/exception/ backend/src/test/
git commit -m "fix: map framework exceptions to 404/405/400/415 instead of falling through to 500"
```

---

## Task 2: Delete dead `ApiError.notFound` factory

`ApiError.notFound(resourceType, identifier)` has zero call sites, and its message format embeds the identifier — contradicting the ws-b-01 Task 3 decision to strip identifiers from user-facing messages.

- [ ] **Step 1: Confirm no usages**

```bash
git grep -n "ApiError.notFound" backend/src
```

Expected: only the definition in `ApiError.java`.

- [ ] **Step 2: Delete the method**, run:

```bash
mvn test -Dtest=ApiResponseSerializationTest,GlobalExceptionHandlerTest
```

- [ ] **Step 3: Commit**

```bash
git add backend/src/main/java/com/workload/dto/ApiError.java
git commit -m "refactor: remove unused ApiError.notFound factory with identifier-leaking message"
```

---

## Task 3: Distinguish login failure from token failure

`InvalidCredentialsException` and `BadCredentialsException` (wrong email/password at login) currently return `"Invalid or expired authentication token"` — nothing expired; the ws-b-01 mapping table conflated login failure with JWT failure. The token message belongs only to the `SecurityConfig` authentication entry point (missing/expired JWT on protected endpoints).

- [ ] **Step 1: Write failing tests** — both handlers return 401 with message `"Invalid email or password"`
- [ ] **Step 2: Update both handlers** in `GlobalExceptionHandler`
- [ ] **Step 3: Verify `SecurityConfig` entry point is unchanged** — still `"Invalid or expired authentication token"`
- [ ] **Step 4: Run tests — expect PASS**
- [ ] **Step 5: Commit**

```bash
git add backend/src/main/java/com/workload/exception/ backend/src/test/
git commit -m "fix: distinguish login failure message from expired-token message"
```

---

## Task 4: Backend quality gates

- [ ] **Step 1:**

```bash
cd backend
mvn spotless:apply
mvn verify
```

Expected: `BUILD SUCCESS`.

**Deferred to MVP (do NOT do now):** unwrapping `DataIntegrityViolationException` via Hibernate's `ConstraintViolationException.getConstraintName()` instead of message-text sniffing; the epic's 503 mapping. Both can ride with MVP M-04/M-06 work.

---

## Task 5: Doc sweep — align source-of-truth docs with the numeric contract

### 5a: CONTRIBUTING.md

- [ ] Replace the "Error responses" envelope example with a numeric one:

```json
{ "data": null, "meta": null, "error": { "code": 422, "message": "Device not found in inventory for this object" } }
```

- [ ] Replace "Error codes are defined in the TOR — use them exactly, do not invent new ones." with: `error.code` is always the numeric HTTP status mirroring the response status line (see `docs/impl/epics/unified-error-handling.md`) — never a semantic string; messages are user-facing, no stack traces or internals.
- [ ] Commit: `docs: update CONTRIBUTING error-response contract to numeric codes`

### 5b: docs/impl/api-spec.md

Fully stale — still documents the string-code contract end to end.

- [ ] Update the error-code table (~line 935) to numeric codes + canonical messages
- [ ] Update per-endpoint error lines to the epic's format `Returns HTTP {code} with message "{user-facing description}"` — grep targets: `NAME_CONFLICT`, `NOT_FOUND`, `OBJECT_NOT_FOUND`, `USER_NOT_FOUND`, `CONTEXT_IN_USE`, `CONFIG_CONSTRAINT_VIOLATED`
- [ ] Update the envelope example (~line 29)
- [ ] Commit: `docs: align api-spec error contract with numeric HTTP codes`

### 5c: TOR remnants

TOR §10 proper is already numeric; five spots were missed:

- [ ] Lines ~1991 and ~2036 — branch duplicate-name examples still `"code": "NAME_CONFLICT"` → `"code": 409`
- [ ] Lines ~1305 and ~2206 — `"code": "CONFIG_CONSTRAINT_VIOLATED"` → `"code": 422` with message
- [ ] Line ~3516 — `"code": "EDIT_CONFLICT"` → `"code": 409` with message
- [ ] Verify clean:

```bash
grep -nE '"code": "[A-Z_]+"' docs/TOR_Workload_WebApp.md docs/impl/api-spec.md CONTRIBUTING.md
```

Expected: no matches.

- [ ] Commit: `docs: convert remaining TOR string error codes to numeric`

### 5d: Forward-compat note for the RBAC plan

`AccessDeniedException` thrown by the security **filter chain** (URL-level rules) never reaches `@RestControllerAdvice` — when RBAC lands, filter-level 403s will bypass the envelope.

- [ ] Add a note to `docs/superpowers/plans/ws-c-01-mvp-m02-rbac-backend.md`: register an `accessDeniedHandler` in `SecurityConfig` (mirroring the existing `authenticationEntryPoint`) so filter-level 403s return the `ApiResponse` envelope with `code: 403`.
- [ ] Commit: `docs: note accessDeniedHandler requirement in RBAC plan`

---

## Task 6: Push and PR

```bash
git push -u origin feature/error-handling-hardening
```

Open a PR targeting `feature/implementation`.

---

## Final Scope Checklist

- [ ] Unknown `/api/...` path → 404 envelope; wrong HTTP method → 405 envelope (no more 500 + ERROR log)
- [ ] Missing/mistyped request parameters → 400; unsupported media type → 415
- [ ] `ApiError.notFound` deleted; no call sites broken
- [ ] Login failure returns "Invalid email or password"; entry point keeps "Invalid or expired authentication token"
- [ ] `grep -nE '"code": "[A-Z_]+"'` over CONTRIBUTING.md, api-spec.md, TOR → no matches
- [ ] ws-c-01 plan carries the `accessDeniedHandler` note
- [ ] `mvn verify` green
- [ ] Nothing under `frontend/` touched

## References

- `docs/superpowers/plans/ws-b-01-error-handling-backend.md` — completed predecessor (PR #14)
- `docs/superpowers/plans/ws-b-02-error-handling-frontend.md` — must merge before this plan starts
- `docs/impl/epics/unified-error-handling.md` — canonical error contract
