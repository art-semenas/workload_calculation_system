# Epic: Unified Error Handling Framework

**Phase:** PoC + MVP (cross-cutting concern)  
**What it delivers:** Standardized error response format using HTTP status codes on the backend, and consistent error display patterns on the frontend (toast notifications, inline validation errors, error pages). All API errors use the unified `ApiResponse` envelope with numeric error codes.

---

## Overview

This epic defines a complete error handling strategy spanning both backend and frontend:

1. **Backend:** Return structured error responses with HTTP status codes (not semantic strings)
2. **Frontend:** Display errors appropriately based on status code and context
3. **API Contract:** Unified response envelope (`data`, `meta`, `error`) with numeric error codes

---

## Part 1: Backend Error Handling

### Error Response Format

**All API errors** use the unified `ApiResponse` envelope with **HTTP status codes** (numeric, not semantic strings):

```java
// Backend returns HTTP 409 with:
{
  "data": null,
  "meta": null,
  "error": {
    "code": 409,
    "message": "A division with this name already exists"
  }
}
```

**Design Principle:** The `error.code` field mirrors the HTTP status code. This unifies error classification: no need for separate semantic codes like `NAME_CONFLICT` or `DEVICE_NOT_IN_INVENTORY`.

**The one exception — 406 Not Acceptable carries no body.** A 406 means no available representation matches the client's `Accept` header, so returning the JSON envelope would contradict the status: content negotiation would simply fail a second time, inside exception handling. The server returns a bare 406 status line, matching Spring's own `ResponseEntityExceptionHandler`. Clients must treat a missing body on 406 as expected — the frontend's `getServerErrorMessage` already type-guards for this and falls back cleanly.

> **Why this must not be "fixed" by attaching a body.** Verified empirically: with no dedicated 406 handler, the generic `Exception` handler builds a 500 envelope, writing that envelope fails negotiation as well, and the exception escapes the `DispatcherServlet` into the servlet container's error dispatch. That dispatch re-enters the security filter chain with an empty `SecurityContext`, so the authentication entry point answers **401** — on a request that was correctly authenticated. Anyone debugging that symptom would go hunting through JWT handling for a content-negotiation bug.

**Response headers on 405 and 415.** A 405 response carries an `Allow` header listing the methods the route does support (required by RFC 9110 §15.5.6); a 415 response carries an `Accept` header listing the media types the endpoint consumes. Handlers that map these exceptions must set those headers, since routing through `@RestControllerAdvice` bypasses the Spring defaults that would otherwise add them.

### HTTP Status Code Mapping

| Code | Status | When to Use | Backend Exception | Example |
|---|---|---|---|---|
| **400** | Bad Request | Malformed JSON or invalid request payload | `HttpMessageNotReadableException` | Missing `{` in JSON body |
| **401** | Unauthorized | JWT token missing, invalid, or expired | `JwtAuthenticationException` | Token not sent or expired |
| **403** | Forbidden | User authenticated but lacks RBAC permission | `AccessDeniedException` | Editor accessing another division |
| **404** | Not Found | Resource (Division, Branch, Object, etc.) doesn't exist, or unknown route | `EntityNotFoundException`, `NoResourceFoundException` | Division ID doesn't exist |
| **405** | Method Not Allowed | HTTP method not supported by the route | `HttpRequestMethodNotSupportedException` | `DELETE /divisions` |
| **406** | Not Acceptable | No response representation matches the client's `Accept` header | `HttpMediaTypeNotAcceptableException` | Client sends `Accept: application/xml` |
| **409** | Conflict | Business rule violation or resource conflict | Custom domain exceptions | Division name already exists, cannot delete division with branches |
| **415** | Unsupported Media Type | Request `Content-Type` not supported | `HttpMediaTypeNotSupportedException` | Body sent as `text/plain` |
| **422** | Unprocessable Entity | Validation failed (Bean Validation, business logic) | `MethodArgumentNotValidException`, custom validators | Invalid `branchId`, missing required field, device context not found |
| **429** | Too Many Requests | Rate limit exceeded (Bucket4j) | `RateLimitExceededException` | IP has exceeded request quota |
| **500** | Server Error | Unexpected backend error | Uncaught exceptions | Database connection lost, NullPointerException in calculation |
| **503** | Service Unavailable | Service temporarily down | `UnavailableException` | Database pod restarting |

### Backend Implementation Requirements

#### 1. GlobalExceptionHandler Updates

**File:** `backend/src/main/java/com/workload/exception/GlobalExceptionHandler.java`

Use Spring's `HttpStatus` enum to map exceptions to error responses:

```java
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

  @ExceptionHandler(EntityNotFoundException.class)
  public ResponseEntity<ApiResponse<?>> handleNotFound(EntityNotFoundException ex) {
    return ResponseEntity.status(HttpStatus.NOT_FOUND)
        .body(ApiResponse.error(ApiError.of(HttpStatus.NOT_FOUND, ex.getMessage())));
  }

  @ExceptionHandler(MethodArgumentNotValidException.class)
  public ResponseEntity<ApiResponse<?>> handleValidation(MethodArgumentNotValidException ex) {
    String message = ex.getBindingResult().getFieldErrors().stream()
        .map(e -> e.getField() + ": " + e.getDefaultMessage())
        .collect(Collectors.joining("; "));
    return ResponseEntity.status(HttpStatus.UNPROCESSABLE_ENTITY)
        .body(ApiResponse.error(ApiError.validationError(message)));
  }

  @ExceptionHandler(DivisionAlreadyExistsException.class)
  public ResponseEntity<ApiResponse<?>> handleDivisionConflict(DivisionAlreadyExistsException ex) {
    return ResponseEntity.status(HttpStatus.CONFLICT)
        .body(ApiResponse.error(ApiError.conflict(ex.getMessage())));
  }

  @ExceptionHandler(AccessDeniedException.class)
  public ResponseEntity<ApiResponse<?>> handleAccessDenied(AccessDeniedException ex) {
    return ResponseEntity.status(HttpStatus.FORBIDDEN)
        .body(ApiResponse.error(ApiError.of(
            HttpStatus.FORBIDDEN,
            "You don't have permission to access this resource"
        )));
  }

  @ExceptionHandler(JwtAuthenticationException.class)
  public ResponseEntity<ApiResponse<?>> handleJwtError(JwtAuthenticationException ex) {
    return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
        .body(ApiResponse.error(ApiError.of(
            HttpStatus.UNAUTHORIZED,
            "Invalid or expired authentication token"
        )));
  }

  @ExceptionHandler(Exception.class)
  public ResponseEntity<ApiResponse<?>> handleGenericError(Exception ex) {
    // Never expose stack traces or internal details to client
    log.error("Unhandled exception", ex);
    return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
        .body(ApiResponse.error(ApiError.internalError()));
  }
}
```

**Usage Pattern:**
- Use `HttpStatus.<STATUS>.value()` to extract numeric code (e.g., `HttpStatus.CONFLICT.value()` → `409`)
- Set both `ResponseEntity.status(HttpStatus.*)` and `ApiError(HttpStatus.*.value(), message)`
- This ensures HTTP status line and error body are always aligned

#### 2. ApiError Record

**File:** `backend/src/main/java/com/workload/dto/ApiError.java`

```java
import org.springframework.http.HttpStatus;

public record ApiError(int code, String message) {
  // code: HTTP status code (400, 401, 403, 404, 409, 422, 500, etc.)
  //       Always use HttpStatus.*.value() to extract the numeric code
  // message: human-readable error description — never include stack traces or internal details

  /**
   * Factory method to create error from HttpStatus
   * @param status Spring HttpStatus enum value
   * @param message User-facing error message
   */
  public static ApiError of(HttpStatus status, String message) {
    return new ApiError(status.value(), message);
  }

  /**
   * Factory method for common error patterns
   */
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
    return of(HttpStatus.INTERNAL_SERVER_ERROR, "An unexpected error occurred. Please try again later.");
  }
}
```

**Usage Pattern:**
```java
// Instead of: new ApiError(HttpStatus.NOT_FOUND.value(), message)
// Use: ApiError.of(HttpStatus.NOT_FOUND, message)
// Or: ApiError.notFound("Division", divisionId)
```

---

#### 3. HttpStatus Usage Guidelines

**Rule 1: Always use `HttpStatus` enum, never hardcoded numbers**
```java
// ❌ BAD
ResponseEntity.status(404).body(ApiResponse.error(...))
ResponseEntity.status(409).body(ApiResponse.error(...))

// ✅ GOOD
ResponseEntity.status(HttpStatus.NOT_FOUND).body(ApiResponse.error(...))
ResponseEntity.status(HttpStatus.CONFLICT).body(ApiResponse.error(...))
```

**Rule 2: Keep HTTP status and error code in sync**
```java
// ❌ BAD — mismatched status and error code
ResponseEntity.status(HttpStatus.NOT_FOUND)
    .body(ApiResponse.error(new ApiError(500, "...")))  // WRONG code!

// ✅ GOOD — aligned
ResponseEntity.status(HttpStatus.NOT_FOUND)
    .body(ApiResponse.error(ApiError.of(HttpStatus.NOT_FOUND, "...")))
```

**Rule 3: Use the `ApiError` factory methods**
```java
// These cover common patterns and prevent mistakes:
ApiError.of(HttpStatus.CONFLICT, message)           // For 409 conflicts
ApiError.conflict(message)                          // Shorthand for 409
ApiError.validationError(message)                   // For 422 validation
ApiError.notFound(resourceType, identifier)         // For 404 not found
ApiError.internalError()                            // For 500 errors
```

#### 3. ApiResponse Builder Methods

**File:** `backend/src/main/java/com/workload/dto/ApiResponse.java`

```java
public record ApiResponse<T>(T data, ApiMeta meta, ApiError error) {

  public static <T> ApiResponse<T> success(T data) {
    return new ApiResponse<>(data, null, null);
  }

  public static <T> ApiResponse<T> success(T data, ApiMeta meta) {
    return new ApiResponse<>(data, meta, null);
  }

  public static <T> ApiResponse<T> error(ApiError error) {
    return new ApiResponse<>(null, null, error);
  }
}
```

#### 4. Domain Exception Classes

Create typed exceptions with appropriate HTTP codes:

```java
// Example: Division already exists
public class DivisionAlreadyExistsException extends RuntimeException {
  // Maps to HTTP 409 in GlobalExceptionHandler
  public DivisionAlreadyExistsException(String name) {
    super("A division with name '" + name + "' already exists");
  }
}

// Example: Division not found
public class DivisionNotFoundException extends RuntimeException {
  // Maps to HTTP 404 in GlobalExceptionHandler
  public DivisionNotFoundException(UUID id) {
    super("Division with ID " + id + " not found");
  }
}
```

#### 5. Error Message Guidelines

- **Be specific:** "Division with name 'Test' already exists" instead of "Error"
- **Be user-facing:** Avoid technical jargon, stack traces, SQL details
- **Be concise:** 1-2 sentences max
- **Be actionable:** Suggest what the user can do

**Examples:**
- ❌ BAD: `NullPointerException in CalculationService.compute()`
- ✅ GOOD: `Failed to calculate workload: required equipment data is missing`

- ❌ BAD: `Duplicate key value violates unique constraint "divisions_name_key"`
- ✅ GOOD: `A division with this name already exists`

- ❌ BAD: `Branch not found`
- ✅ GOOD: `Branch not found in the selected division`

#### 6. No Semantic String Codes

**Invalid (old approach):**
```java
ApiResponse.error(new ApiError("NAME_CONFLICT", "..."))
ApiResponse.error(new ApiError("DEVICE_NOT_IN_INVENTORY", "..."))
ApiResponse.error(new ApiError("CONTEXT_IN_USE", "..."))
```

**Valid (new approach):**
```java
// Always use HttpStatus.*.value() to extract codes
ApiResponse.error(ApiError.of(HttpStatus.CONFLICT, "A division with this name already exists"))
ApiResponse.error(ApiError.validationError("Device not found in inventory"))
ApiResponse.error(ApiError.conflict("Cannot delete: 3 objects use this context"))

// Or use the factory methods on ApiError
ApiResponse.error(ApiError.conflict("Division name already exists"))
ApiResponse.error(ApiError.notFound("Division", divisionId.toString()))
```

**Best Practice — Never hardcode numeric codes:**
```java
// ❌ BAD — hardcoded magic numbers
ApiResponse.error(new ApiError(409, "..."))
ApiResponse.error(new ApiError(422, "..."))

// ✅ GOOD — use HttpStatus enum
ApiResponse.error(ApiError.of(HttpStatus.CONFLICT, "..."))
ApiResponse.error(ApiError.validationError("..."))
```

### Backend Error Response Examples

#### 409 Conflict — Division name already exists
```json
HTTP 409 Conflict
{
  "data": null,
  "meta": null,
  "error": {
    "code": 409,
    "message": "A division with this name already exists"
  }
}
```

#### 422 Unprocessable Entity — Validation failed
```json
HTTP 422 Unprocessable Entity
{
  "data": null,
  "meta": null,
  "error": {
    "code": 422,
    "message": "Invalid branch ID: branch not found in this division"
  }
}
```

#### 404 Not Found
```json
HTTP 404 Not Found
{
  "data": null,
  "meta": null,
  "error": {
    "code": 404,
    "message": "Division not found"
  }
}
```

#### 500 Server Error (no stack trace exposed)
```json
HTTP 500 Internal Server Error
{
  "data": null,
  "meta": null,
  "error": {
    "code": 500,
    "message": "An unexpected error occurred. Please try again later."
  }
}
```

#### 422 Rate Limit
```json
HTTP 429 Too Many Requests
{
  "data": null,
  "meta": null,
  "error": {
    "code": 429,
    "message": "Too many requests. Please wait 30 seconds before retrying."
  }
}
```

---

## Part 2: Frontend Error Handling

### Error Display Patterns

#### Pattern 1: Toast Notifications (Network/Conflict Errors)
**When:** API request fails with 404, 409, 500, or network timeout  
**What:** Auto-dismissing toast (snackbar) at bottom-right

```typescript
// useDivisions.ts hook
export function useDivisions() {
  return useQuery({
    queryKey: ['divisions'],
    queryFn: getDivisions,
    onError: (error) => {
      const code = error.response?.data?.error?.code;
      const message = error.response?.data?.error?.message;
      const severity = code === 409 ? 'warning' : 'error';
      showNotification(message || 'Failed to load divisions', severity);
    },
  });
}
```

**UI:** 
- Auto-dismiss after 5 seconds
- Close (×) button for manual dismissal
- Color coding: yellow for 409 (warning), red for 4xx/5xx (error)

#### Pattern 2: Inline Form Field Errors (Validation)
**When:** Form submission fails with 422 or client-side Zod validation  
**What:** Error message below form field, red border on input

```typescript
// DivisionListPage.tsx
const handleCreate = handleSubmit(async (formData) => {
  try {
    await createDivision.mutateAsync(formData);
    handleClose();
  } catch (error) {
    const code = error.response?.data?.error?.code;
    if (code === 422) {
      // Server validation error — show inline
      setFieldError('name', error.response.data.error.message);
    } else {
      // Other errors — show toast
      showNotification('Failed to create division', 'error');
    }
  }
});
```

#### Pattern 3: Error Pages (Unrecoverable Errors)
**When:** Critical errors preventing page render (500, 503, network down)  
**What:** Full-page error message with Retry button

```typescript
if (isError && error.response?.data?.error?.code >= 500) {
  return (
    <Box sx={{ textAlign: 'center', py: 6 }}>
      <Typography variant="h4" color="error">
        Something went wrong
      </Typography>
      <Typography color="text.secondary">
        {error.response.data.error.message}
      </Typography>
      <Button onClick={() => window.location.reload()}>
        Try again
      </Button>
    </Box>
  );
}
```

#### Pattern 4: 401 Unauthorized (Session Expired)
**When:** Token invalid or expired  
**What:** Clear auth state, redirect to `/login`

```typescript
// axios.ts interceptor
api.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (shouldRedirectToLogin(error)) {
      useAuthStore.getState().logout();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);
```

### Network Error Handling

```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 3,  // Retry 3 times on network failure
      retryDelay: (attemptIndex) => 
        Math.min(1000 * 2 ** attemptIndex, 30000),  // Exponential backoff: 1s, 2s, 4s, max 30s
      onError: (error) => {
        if (error instanceof AxiosError && !error.response) {
          // Network error (no response from server)
          showNotification(
            'Network error. Please check your connection and try again.',
            'error'
          );
        }
      },
    },
  },
});
```

---

## Acceptance Criteria

**Backend ACs:**

**AC-BE-01:** `GlobalExceptionHandler` maps `DivisionAlreadyExistsException` to HTTP 409 with response: `{ "data": null, "error": { "code": 409, "message": "A division with this name already exists" } }`

**AC-BE-02:** All error responses include `error.code` as a numeric HTTP status code (400, 401, 403, 404, 409, 422, 500, etc.), never as a semantic string.

**AC-BE-03:** Error messages never include stack traces, SQL queries, internal class names, or other technical details. All messages are user-facing and actionable.

**AC-BE-04:** `GlobalExceptionHandler` catches all uncaught exceptions and returns HTTP 500 with message "An unexpected error occurred. Please try again later." (no details exposed).

**AC-BE-05:** `ApiError` record stores `code` as `int` and `message` as `String`. Both are required (never null).

---

**Frontend ACs:**

**AC-FE-01:** When `POST /divisions` fails with HTTP 409 (duplicate name), frontend displays a toast notification with the message from `error.message`. Toast auto-dismisses after 5 seconds or on user click.

**AC-FE-02:** When a form submission fails with HTTP 422 (validation error), the error message is displayed inline below the form field with red text and red border. No toast is shown.

**AC-FE-03:** When an API request fails with HTTP 401, the application clears the JWT token from auth state and redirects to `/login`.

**AC-FE-04:** When an API request fails with HTTP 5xx (server error), frontend displays a full-page error message with a "Try again" button that reloads the page.

**AC-FE-05:** Network timeouts (no response from server within 30s) show a toast: "Network error. Please check your connection and try again." TanStack Query automatically retries up to 3 times with exponential backoff (1s, 2s, 4s, max 30s).

**AC-FE-06:** Error codes in API responses are checked as numbers (e.g., `if (code === 409)`, not `if (code === 'NAME_CONFLICT')`).

**AC-FE-07:** Error toasts include a close (×) button for manual dismissal. Severity level (warning vs. error) is determined by HTTP status: 409 = warning (yellow), others 4xx/5xx = error (red).

---

## TOR §10 Alignment

This epic **aligns with updated TOR §10 — API Design** which now specifies:
- All error responses use HTTP status codes in `error.code` field (not semantic strings)
- Error messages are human-readable and user-facing
- Response envelope structure: `{ "data": ..., "meta": ..., "error": { "code": <int>, "message": "<string>" } }`

See TOR §10.3 "Response Format" for complete specification.

---

## Impact on Other Epics

This epic **supersedes** all references to semantic error codes in other epics. The following changes have been made to align with the unified error handling approach:

**Updated Epics:**
- **PoC M-01 (Core CRUD):** AC-05, AC-11, AC-13 updated to reference HTTP 422 with descriptive messages instead of codes like `NO_CONTEXT_FOR_SYSTEM`, `DEVICE_NOT_IN_INVENTORY`
- **MVP M-04/M-05 (Catalog Management):** AC-05 updated to reference HTTP 422 with descriptive messages

**Pattern for Future Epics:**
When defining acceptance criteria for error scenarios, use this format:
```
Returns HTTP {code} with message "{user-facing description}"
```

**Example (do this):**
> Returns HTTP 409 with message "A division with this name already exists"

**Not this (old approach):**
> Returns HTTP 409 with code `NAME_CONFLICT`

---

## Implementation Timeline

### PoC
- Update `GlobalExceptionHandler` to use HTTP codes (400, 401, 404, 409, 422, 500)
- Implement error display for all M-01 forms (divisions, branches, objects)
- Toast notifications for 409 (conflict) and 404 (not found)
- Inline form errors for 422 (validation)
- 401 redirect (already implemented)

### MVP (M-01, M-04, M-05)
- Extend error handling to all new endpoints (import, catalog management)
- Add error boundary component for unhandled React errors
- Network retry logic with exponential backoff in Axios/TanStack Query
- Improve error messages with domain-specific context

---

## Backend Developer Checklist

Before submitting a PR with error handling:

- [ ] All exceptions are caught in `GlobalExceptionHandler` — no stack traces leak to client
- [ ] All error responses use `ResponseEntity.status(HttpStatus.*)` — never hardcoded numbers
- [ ] Error code in `ApiError` matches HTTP status: `ApiError.of(HttpStatus.CONFLICT, message)`
- [ ] Error messages are user-facing: no SQL, stack traces, internal class names
- [ ] Error messages are concise: 1-2 sentences max, actionable guidance
- [ ] `ApiError` factory methods are used where applicable: `.conflict()`, `.validationError()`, `.notFound()`, etc.
- [ ] Both sync and async code paths return consistent error responses
- [ ] 401 errors return `HttpStatus.UNAUTHORIZED` (not 403)
- [ ] 404 errors return `HttpStatus.NOT_FOUND` (not 400)
- [ ] Validation errors return `HttpStatus.UNPROCESSABLE_ENTITY` (422), not 400
- [ ] Business rule violations (e.g., name conflict) return `HttpStatus.CONFLICT` (409)
- [ ] Generic/unexpected errors return `HttpStatus.INTERNAL_SERVER_ERROR` (500) without details

---

## Out of Scope

- Error logging/reporting to external services (Datadog) — handled in TOR §18
- Sentry or Rollbar integration — post-MVP
- Error analytics dashboard — post-MVP
- Internationalization (i18n) of error messages — post-MVP (English only for now)
- Custom error page for each HTTP code — post-MVP
