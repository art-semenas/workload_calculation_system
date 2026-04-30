# WS-B Step 1 — Unified Error Handling: Backend

> **For agentic workers:** Use `superpowers:executing-plans` to implement this plan task-by-task.

**Goal:** Migrate the backend from semantic string error codes (`DEVICE_NOT_IN_INVENTORY`, `NAME_CONFLICT`) to numeric HTTP status codes in the `error.code` field. Update `ApiError` record, refactor `GlobalExceptionHandler` to use `HttpStatus` enum, and ensure all error responses are consistent, user-facing, and never expose stack traces.

**Branch:** `feature/error-handling-backend`
**Depends on:** `feature/implementation` (PoC M-03 complete)
**Workstream:** B — Unified Error Handling (cross-cutting PoC + MVP concern)

**Epic:** `docs/impl/epics/unified-error-handling.md` — the canonical spec for all changes in this plan.

---

## Source-Of-Truth Alignment

1. `docs/impl/epics/unified-error-handling.md` — authoritative for HTTP code mapping, `ApiError` shape, `GlobalExceptionHandler` implementation, and all acceptance criteria
2. `docs/TOR_Workload_WebApp.md §10` — API design spec (updated to use numeric codes)
3. `CONTRIBUTING.md` — TDD required, `mvn verify` must pass before PR

**Key rule:** `error.code` is always a numeric HTTP status code (409, 422, 404, etc.) — never a semantic string like `NAME_CONFLICT`. See epic §"No Semantic String Codes".

---

## Task 0: Create feature branch

- [ ] **Step 1:**

```bash
git checkout feature/implementation
git pull origin feature/implementation
git checkout -b feature/error-handling-backend
```

---

## Task 1: Update `ApiError` record

**Files:**
- Modify: `backend/src/main/java/com/workload/dto/ApiError.java`
- Modify: `backend/src/test/java/com/workload/support/ApiResponseSerializationTest.java`

Current `ApiError` uses `String code`. Target uses `int code` matching HTTP status.

- [ ] **Step 1: Write failing test**

Update `ApiResponseSerializationTest`:

```java
@Test
void errorEnvelopeUsesNumericCode() throws Exception {
    ApiResponse<Void> response = ApiResponse.error(
        ApiError.of(HttpStatus.CONFLICT, "A division with this name already exists"));

    String json = objectMapper.writeValueAsString(response);

    assertThat(json).contains("\"code\":409");
    assertThat(json).contains("\"data\":null");
    assertThat(json).doesNotContain("NAME_CONFLICT");
}
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
cd backend && mvn test -Dtest=ApiResponseSerializationTest
```

- [ ] **Step 3: Update `ApiError.java`**

Replace `String code` field with `int code`. Add factory methods:

```java
public record ApiError(int code, String message) {
    public static ApiError of(HttpStatus status, String message) {
        return new ApiError(status.value(), message);
    }
    public static ApiError notFound(String resourceType, String identifier) {
        return of(HttpStatus.NOT_FOUND, resourceType + " not found: " + identifier);
    }
    public static ApiError conflict(String message) {
        return of(HttpStatus.CONFLICT, message);
    }
    public static ApiError validationError(String message) {
        return of(HttpStatus.UNPROCESSABLE_ENTITY, message);
    }
    public static ApiError internalError() {
        return of(HttpStatus.INTERNAL_SERVER_ERROR,
            "An unexpected error occurred. Please try again later.");
    }
}
```

- [ ] **Step 4: Fix compilation errors**

The change from `String` to `int` will break all existing `new ApiError(...)` call sites. Find and fix all:

```bash
cd backend
mvn compile 2>&1 | grep "error:" | head -30
```

Update each call site to use the factory methods:
- `new ApiError("DEVICE_NOT_IN_INVENTORY", "...")` → `ApiError.validationError("Device not found in inventory")`
- `new ApiError("NAME_CONFLICT", "...")` → `ApiError.conflict("A division with this name already exists")`
- `new ApiError("CONTEXT_IN_USE", "...")` → `ApiError.conflict("Cannot delete: context is in use by N objects")`
- `new ApiError("RATE_LIMIT_EXCEEDED", "...")` → `ApiError.of(HttpStatus.TOO_MANY_REQUESTS, "Too many requests. Please wait before retrying.")`
- `new ApiError("VALIDATION_ERROR", "...")` → `ApiError.validationError(message)`
- etc.

- [ ] **Step 5: Run test — expect PASS**

```bash
mvn test -Dtest=ApiResponseSerializationTest
```

- [ ] **Step 6: Commit**

```bash
git add backend/src/main/java/com/workload/dto/ApiError.java
git commit -m "feat: migrate ApiError from string codes to numeric HTTP status codes"
```

---

## Task 2: Refactor `GlobalExceptionHandler`

**Files:**
- Modify: `backend/src/main/java/com/workload/exception/GlobalExceptionHandler.java`
- Modify: `backend/src/test/java/com/workload/exception/GlobalExceptionHandlerTest.java`

**Target mapping (from epic §"HTTP Status Code Mapping"):**

| Exception | HTTP Status | Error message |
|---|---|---|
| `EntityNotFoundException` (and subtypes) | 404 | `"{Resource} not found"` |
| `MethodArgumentNotValidException` | 422 | field errors joined with `"; "` |
| `DivisionAlreadyExistsException` | 409 | `"A division with this name already exists"` |
| `DeviceNotInInventoryException` | 422 | `"Device not found in inventory"` |
| `NoContextForSystemException` | 422 | `"No norms configured for this system"` |
| `RoundTripNotEditableException` | 422 | `"Round trip time is calculated automatically and cannot be set directly"` |
| `ContextInUseException` | 409 | `"Cannot delete: N objects use this context"` |
| `AccessDeniedException` | 403 | `"You don't have permission to access this resource"` |
| `JwtAuthenticationException` / bad credentials | 401 | `"Invalid or expired authentication token"` |
| `HttpMessageNotReadableException` | 400 | `"Malformed request body"` |
| Any other `Exception` | 500 | `"An unexpected error occurred. Please try again later."` |

- [ ] **Step 1: Write failing tests for each mapping**

Update `GlobalExceptionHandlerTest` to verify each exception maps to the correct HTTP status code:

```java
@Test
void entityNotFoundMapsTo404() {
    ResponseEntity<ApiResponse<?>> response =
        handler.handleNotFound(new EntityNotFoundException("Division", UUID.randomUUID().toString()));
    assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
    assertThat(response.getBody().error().code()).isEqualTo(404);
}

@Test
void divisionAlreadyExistsMapsTo409() {
    ResponseEntity<ApiResponse<?>> response =
        handler.handleDivisionConflict(new DivisionAlreadyExistsException("Test"));
    assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
    assertThat(response.getBody().error().code()).isEqualTo(409);
}

@Test
void genericExceptionMapsTo500WithoutDetails() {
    ResponseEntity<ApiResponse<?>> response =
        handler.handleGenericError(new RuntimeException("internal stacktrace detail"));
    assertThat(response.getStatusCode()).isEqualTo(HttpStatus.INTERNAL_SERVER_ERROR);
    assertThat(response.getBody().error().message())
        .doesNotContain("stacktrace")
        .isEqualTo("An unexpected error occurred. Please try again later.");
}
```

Add a test for each row in the mapping table.

- [ ] **Step 2: Run test — expect FAIL**

```bash
mvn test -Dtest=GlobalExceptionHandlerTest
```

- [ ] **Step 3: Refactor `GlobalExceptionHandler`**

Replace all `new ApiError(...)` calls with factory methods. Use `ResponseEntity.status(HttpStatus.*).body(...)` — never hardcoded numbers.

Follow the pattern from the epic exactly:

```java
@ExceptionHandler(EntityNotFoundException.class)
public ResponseEntity<ApiResponse<?>> handleNotFound(EntityNotFoundException ex) {
    return ResponseEntity.status(HttpStatus.NOT_FOUND)
        .body(ApiResponse.error(ApiError.of(HttpStatus.NOT_FOUND, ex.getMessage())));
}

@ExceptionHandler(Exception.class)
public ResponseEntity<ApiResponse<?>> handleGenericError(Exception ex) {
    log.error("Unhandled exception", ex);
    return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
        .body(ApiResponse.error(ApiError.internalError()));
}
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
mvn test -Dtest=GlobalExceptionHandlerTest
```

- [ ] **Step 5: Commit**

```bash
git add backend/src/main/java/com/workload/exception/GlobalExceptionHandler.java backend/src/test/java/com/workload/exception/GlobalExceptionHandlerTest.java
git commit -m "refactor: update GlobalExceptionHandler to use HttpStatus enum and numeric error codes"
```

---

## Task 3: Update domain exception messages

**Files:**
- Modify: exception classes under `backend/src/main/java/com/workload/exception/`

All exception messages must be user-facing and actionable (not technical):

- `EntityNotFoundException` → `"{ResourceType} not found"` (pass resource type and id in constructor)
- `DivisionAlreadyExistsException` → `"A division with name '{name}' already exists"`
- `DeviceNotInInventoryException` → `"Device not found in inventory for this object"`
- `NoContextForSystemException` → `"No norms configured for this system type"`
- `ContextInUseException` → `"Cannot delete: {count} object(s) use this context"`
- `RoundTripNotEditableException` → `"Round trip time is auto-calculated and cannot be edited directly"`

- [ ] **Step 1: Update each exception class constructor message**
- [ ] **Step 2: Run `GlobalExceptionHandlerTest` to confirm messages flow through**
- [ ] **Step 3: Commit**

```bash
git add backend/src/main/java/com/workload/exception/
git commit -m "fix: improve exception messages to be user-facing and actionable"
```

---

## Task 4: Update `RateLimitFilter` error response

**Files:**
- Modify: `backend/src/main/java/com/workload/config/RateLimitFilter.java`

Current: returns `new ApiError("RATE_LIMIT_EXCEEDED", ...)`.
Target: returns `ApiError.of(HttpStatus.TOO_MANY_REQUESTS, "Too many requests. Please wait before retrying.")`.

- [ ] **Step 1: Update filter**
- [ ] **Step 2: Update `RateLimitFilterTest` to assert `code == 429`**
- [ ] **Step 3: Run test**

```bash
mvn test -Dtest=RateLimitFilterTest
```

- [ ] **Step 4: Commit**

```bash
git add backend/src/main/java/com/workload/config/RateLimitFilter.java backend/src/test/java/com/workload/config/RateLimitFilterTest.java
git commit -m "fix: update rate limit filter to use HTTP 429 numeric code"
```

---

## Task 5: Integration test verification

**Files:**
- Review: all `*IT.java` integration tests

Existing integration tests may assert on old string error codes. Find and update them:

```bash
grep -r "DEVICE_NOT_IN_INVENTORY\|NAME_CONFLICT\|CONTEXT_IN_USE\|ROUND_TRIP\|RATE_LIMIT" \
  backend/src/test/
```

For each match, update the assertion to check the numeric code instead:
```java
// Old
.body("error.code", equalTo("DEVICE_NOT_IN_INVENTORY"))

// New
.statusCode(422)
.body("error.code", equalTo(422))
.body("error.message", containsString("Device not found"))
```

- [ ] **Step 1: Find all string code assertions**
- [ ] **Step 2: Update each assertion**
- [ ] **Step 3: Run affected test classes**
- [ ] **Step 4: Commit**

```bash
git add backend/src/test/
git commit -m "test: update integration tests to assert numeric error codes instead of string codes"
```

---

## Task 6: Run full backend quality gates

- [ ] **Step 1:**

```bash
cd backend
mvn spotless:apply
mvn verify
```

Expected: `BUILD SUCCESS`. All unit tests, integration tests, Jacoco, SpotBugs, Spotless pass.

- [ ] **Step 2: Fix any failures**

- [ ] **Step 3: Commit gate fixes if needed**

```bash
git add backend
git commit -m "fix: satisfy backend quality gates after error handling migration"
```

- [ ] **Step 4: Push**

```bash
git push -u origin feature/error-handling-backend
```

---

## Final Scope Checklist

- [ ] `ApiError.code` is `int`, not `String`
- [ ] All factory methods present: `of()`, `notFound()`, `conflict()`, `validationError()`, `internalError()`
- [ ] `GlobalExceptionHandler` uses `HttpStatus.*` enum — no hardcoded numbers anywhere
- [ ] 404, 409, 422, 401, 403, 400, 429, 500 all covered in handler
- [ ] No stack traces or internal details exposed in error messages
- [ ] All exception messages are user-facing and actionable
- [ ] Rate limit filter returns 429 with numeric code
- [ ] All integration tests updated to assert numeric codes
- [ ] `mvn verify` passes

## References

- `docs/impl/epics/unified-error-handling.md` — full spec including code examples
- `docs/impl/api-spec.md` §10 — API envelope contract
- `docs/TOR_Workload_WebApp.md §10` — response format
