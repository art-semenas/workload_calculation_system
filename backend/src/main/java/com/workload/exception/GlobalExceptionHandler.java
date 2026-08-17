package com.workload.exception;

import com.workload.dto.ApiError;
import com.workload.dto.ApiResponse;
import jakarta.validation.ConstraintViolationException;
import java.util.List;
import java.util.Set;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.ResponseEntity.BodyBuilder;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.util.CollectionUtils;
import org.springframework.web.HttpMediaTypeNotAcceptableException;
import org.springframework.web.HttpMediaTypeNotSupportedException;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

@RestControllerAdvice
public class GlobalExceptionHandler {

  private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

  @ExceptionHandler(SummaryNotFoundException.class)
  public ResponseEntity<ApiResponse<Void>> handleSummaryNotFound(SummaryNotFoundException ex) {
    return ResponseEntity.status(HttpStatus.NOT_FOUND)
        .body(ApiResponse.error(ApiError.of(HttpStatus.NOT_FOUND, ex.getMessage())));
  }

  @ExceptionHandler(DivisionNotFoundException.class)
  public ResponseEntity<ApiResponse<Void>> handleDivisionNotFound(DivisionNotFoundException ex) {
    return ResponseEntity.status(HttpStatus.NOT_FOUND)
        .body(ApiResponse.error(ApiError.of(HttpStatus.NOT_FOUND, "Division not found")));
  }

  @ExceptionHandler(BranchNotFoundException.class)
  public ResponseEntity<ApiResponse<Void>> handleBranchNotFound(BranchNotFoundException ex) {
    return ResponseEntity.status(HttpStatus.NOT_FOUND)
        .body(ApiResponse.error(ApiError.of(HttpStatus.NOT_FOUND, "Branch not found")));
  }

  @ExceptionHandler(ObjectNotFoundException.class)
  public ResponseEntity<ApiResponse<Void>> handleObjectNotFound(ObjectNotFoundException ex) {
    return ResponseEntity.status(HttpStatus.NOT_FOUND)
        .body(ApiResponse.error(ApiError.of(HttpStatus.NOT_FOUND, "Object not found")));
  }

  @ExceptionHandler(UserNotFoundException.class)
  public ResponseEntity<ApiResponse<Void>> handleUserNotFound(UserNotFoundException ex) {
    return ResponseEntity.status(HttpStatus.NOT_FOUND)
        .body(ApiResponse.error(ApiError.of(HttpStatus.NOT_FOUND, "User not found")));
  }

  @ExceptionHandler(InvalidRoleForEndpointException.class)
  public ResponseEntity<ApiResponse<Void>> handleInvalidRoleForEndpoint(
      InvalidRoleForEndpointException ex) {
    return ResponseEntity.status(HttpStatus.UNPROCESSABLE_ENTITY)
        .body(ApiResponse.error(ApiError.validationError(ex.getMessage())));
  }

  @ExceptionHandler(EntityNotFoundException.class)
  public ResponseEntity<ApiResponse<Void>> handleEntityNotFound(EntityNotFoundException ex) {
    return ResponseEntity.status(HttpStatus.NOT_FOUND)
        .body(
            ApiResponse.error(
                ApiError.of(HttpStatus.NOT_FOUND, getEntityNotFoundMessage(ex.getEntityType()))));
  }

  @ExceptionHandler(DivisionHasBranchesException.class)
  public ResponseEntity<ApiResponse<Void>> handleDivisionHasBranches(
      DivisionHasBranchesException ex) {
    return ResponseEntity.status(HttpStatus.CONFLICT)
        .body(ApiResponse.error(ApiError.conflict(ex.getMessage())));
  }

  @ExceptionHandler(BranchHasObjectsException.class)
  public ResponseEntity<ApiResponse<Void>> handleBranchHasObjects(BranchHasObjectsException ex) {
    return ResponseEntity.status(HttpStatus.CONFLICT)
        .body(ApiResponse.error(ApiError.conflict(ex.getMessage())));
  }

  @ExceptionHandler(LastAdminException.class)
  public ResponseEntity<ApiResponse<Void>> handleLastAdmin(LastAdminException ex) {
    return ResponseEntity.status(HttpStatus.CONFLICT)
        .body(ApiResponse.error(ApiError.conflict(ex.getMessage())));
  }

  @ExceptionHandler(EngineerHasActiveAssignmentsException.class)
  public ResponseEntity<ApiResponse<Void>> handleEngineerHasActiveAssignments(
      EngineerHasActiveAssignmentsException ex) {
    return ResponseEntity.status(HttpStatus.CONFLICT)
        .body(ApiResponse.error(ApiError.conflict(ex.getMessage())));
  }

  @ExceptionHandler(EngineerInactiveException.class)
  public ResponseEntity<ApiResponse<Void>> handleEngineerInactive(EngineerInactiveException ex) {
    return ResponseEntity.status(HttpStatus.UNPROCESSABLE_ENTITY)
        .body(ApiResponse.error(ApiError.validationError(ex.getMessage())));
  }

  @ExceptionHandler(InvalidEngineerRoleException.class)
  public ResponseEntity<ApiResponse<Void>> handleInvalidEngineerRole(
      InvalidEngineerRoleException ex) {
    return ResponseEntity.status(HttpStatus.UNPROCESSABLE_ENTITY)
        .body(ApiResponse.error(ApiError.validationError(ex.getMessage())));
  }

  @ExceptionHandler(AssignmentNotFoundException.class)
  public ResponseEntity<ApiResponse<Void>> handleAssignmentNotFound(
      AssignmentNotFoundException ex) {
    return ResponseEntity.status(HttpStatus.NOT_FOUND)
        .body(ApiResponse.error(ApiError.of(HttpStatus.NOT_FOUND, ex.getMessage())));
  }

  @ExceptionHandler(DataIntegrityViolationException.class)
  public ResponseEntity<ApiResponse<Void>> handleDataIntegrityViolation(
      DataIntegrityViolationException ex) {
    String msg = ex.getMessage() != null ? ex.getMessage().toLowerCase() : "";
    if (msg.contains("uq_oe_object_engineer")) {
      return ResponseEntity.status(HttpStatus.CONFLICT)
          .body(
              ApiResponse.error(
                  ApiError.conflict("This engineer is already assigned to the object")));
    }
    if (msg.contains("unique") || msg.contains("duplicate")) {
      return ResponseEntity.status(HttpStatus.CONFLICT)
          .body(ApiResponse.error(ApiError.conflict("A record with that name already exists")));
    }
    return ResponseEntity.status(HttpStatus.CONFLICT)
        .body(ApiResponse.error(ApiError.conflict("A database constraint was violated")));
  }

  @ExceptionHandler(DeviceNotInInventoryException.class)
  public ResponseEntity<ApiResponse<Void>> handleDeviceNotInInventory(
      DeviceNotInInventoryException ex) {
    return ResponseEntity.status(HttpStatus.UNPROCESSABLE_ENTITY)
        .body(ApiResponse.error(ApiError.validationError(ex.getMessage())));
  }

  @ExceptionHandler(NoContextForSystemException.class)
  public ResponseEntity<ApiResponse<Void>> handleNoContextForSystem(
      NoContextForSystemException ex) {
    return ResponseEntity.status(HttpStatus.UNPROCESSABLE_ENTITY)
        .body(ApiResponse.error(ApiError.validationError(ex.getMessage())));
  }

  @ExceptionHandler(RoundTripNotEditableException.class)
  public ResponseEntity<ApiResponse<Void>> handleRoundTripNotEditable(
      RoundTripNotEditableException ex) {
    return ResponseEntity.status(HttpStatus.UNPROCESSABLE_ENTITY)
        .body(ApiResponse.error(ApiError.validationError(ex.getMessage())));
  }

  @ExceptionHandler(RequestValidationException.class)
  public ResponseEntity<ApiResponse<Void>> handleRequestValidation(RequestValidationException ex) {
    return ResponseEntity.status(HttpStatus.UNPROCESSABLE_ENTITY)
        .body(ApiResponse.error(ApiError.validationError(ex.getMessage())));
  }

  @ExceptionHandler(HttpMessageNotReadableException.class)
  public ResponseEntity<ApiResponse<Void>> handleMessageNotReadable(
      HttpMessageNotReadableException ex) {
    return ResponseEntity.status(HttpStatus.BAD_REQUEST)
        .body(ApiResponse.error(ApiError.of(HttpStatus.BAD_REQUEST, "Malformed request body")));
  }

  @ExceptionHandler(MethodArgumentNotValidException.class)
  public ResponseEntity<ApiResponse<Void>> handleValidation(MethodArgumentNotValidException ex) {
    String message =
        ex.getBindingResult().getFieldErrors().stream()
            .map(fe -> fe.getField() + ": " + fe.getDefaultMessage())
            .reduce((a, b) -> a + "; " + b)
            .orElse("Validation failed");
    return ResponseEntity.status(HttpStatus.UNPROCESSABLE_ENTITY)
        .body(ApiResponse.error(ApiError.validationError(message)));
  }

  @ExceptionHandler(InvalidCredentialsException.class)
  public ResponseEntity<ApiResponse<Void>> handleInvalidCredentials(
      InvalidCredentialsException ex) {
    // Login failure, not token failure — the token message belongs to the SecurityConfig
    // authentication entry point (missing/expired JWT on a protected endpoint).
    return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
        .body(ApiResponse.error(ApiError.of(HttpStatus.UNAUTHORIZED, "Invalid email or password")));
  }

  @ExceptionHandler(AccountLockedException.class)
  public ResponseEntity<ApiResponse<Void>> handleAccountLocked(AccountLockedException ex) {
    // 401 like any other login failure: the caller is still unauthenticated.
    return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
        .body(ApiResponse.error(ApiError.of(HttpStatus.UNAUTHORIZED, ex.getMessage())));
  }

  @ExceptionHandler(DeviceTypeInUseException.class)
  public ResponseEntity<ApiResponse<Void>> handleDeviceTypeInUse(DeviceTypeInUseException ex) {
    return ResponseEntity.status(HttpStatus.CONFLICT)
        .body(ApiResponse.error(ApiError.conflict(ex.getMessage())));
  }

  @ExceptionHandler(DeviceInUseException.class)
  public ResponseEntity<ApiResponse<Void>> handleDeviceInUse(DeviceInUseException ex) {
    return ResponseEntity.status(HttpStatus.CONFLICT)
        .body(ApiResponse.error(ApiError.conflict(ex.getMessage())));
  }

  @ExceptionHandler(ContextInUseException.class)
  public ResponseEntity<ApiResponse<Void>> handleContextInUse(ContextInUseException ex) {
    return ResponseEntity.status(HttpStatus.CONFLICT)
        .body(ApiResponse.error(ApiError.conflict(ex.getMessage())));
  }

  @ExceptionHandler(RepairTypeInUseException.class)
  public ResponseEntity<ApiResponse<Void>> handleRepairTypeInUse(RepairTypeInUseException ex) {
    return ResponseEntity.status(HttpStatus.CONFLICT)
        .body(ApiResponse.error(ApiError.conflict(ex.getMessage())));
  }

  @ExceptionHandler(BadCredentialsException.class)
  public ResponseEntity<ApiResponse<Void>> handleBadCredentials(BadCredentialsException ex) {
    return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
        .body(ApiResponse.error(ApiError.of(HttpStatus.UNAUTHORIZED, "Invalid email or password")));
  }

  @ExceptionHandler(AccessDeniedException.class)
  public ResponseEntity<ApiResponse<Void>> handleAccessDenied(AccessDeniedException ex) {
    return ResponseEntity.status(HttpStatus.FORBIDDEN)
        .body(
            ApiResponse.error(
                ApiError.of(
                    HttpStatus.FORBIDDEN, "You don't have permission to access this resource")));
  }

  // Framework exceptions below are client mistakes, not server faults — they are mapped to their
  // proper status instead of falling through to the generic 500 handler, and are not logged at
  // ERROR so the JSON log stream stays meaningful.

  @ExceptionHandler(NoResourceFoundException.class)
  public ResponseEntity<ApiResponse<Void>> handleNoResourceFound(NoResourceFoundException ex) {
    return ResponseEntity.status(HttpStatus.NOT_FOUND)
        .body(ApiResponse.error(ApiError.of(HttpStatus.NOT_FOUND, "Resource not found")));
  }

  @ExceptionHandler(HttpRequestMethodNotSupportedException.class)
  public ResponseEntity<ApiResponse<Void>> handleMethodNotSupported(
      HttpRequestMethodNotSupportedException ex) {
    BodyBuilder builder = ResponseEntity.status(HttpStatus.METHOD_NOT_ALLOWED);
    // RFC 9110 §15.5.6: a 405 must advertise the methods the resource does support.
    Set<HttpMethod> supportedMethods = ex.getSupportedHttpMethods();
    if (!CollectionUtils.isEmpty(supportedMethods)) {
      builder.allow(supportedMethods.toArray(new HttpMethod[0]));
    }
    return builder.body(
        ApiResponse.error(ApiError.of(HttpStatus.METHOD_NOT_ALLOWED, "Method not allowed")));
  }

  @ExceptionHandler(MissingServletRequestParameterException.class)
  public ResponseEntity<ApiResponse<Void>> handleMissingRequestParameter(
      MissingServletRequestParameterException ex) {
    return ResponseEntity.status(HttpStatus.BAD_REQUEST)
        .body(
            ApiResponse.error(
                ApiError.of(
                    HttpStatus.BAD_REQUEST,
                    "Missing required parameter: " + ex.getParameterName())));
  }

  /**
   * Bean Validation on a query parameter — {@code @Min}/{@code @Max} on a {@code @RequestParam} of
   * a {@code @Validated} controller. Reported as 400 with the same wording as a type-conversion
   * failure, because from the caller's side both are the same mistake: an unusable parameter value.
   * The violation's property path is {@code method.parameter}, so the last node is the name.
   */
  @ExceptionHandler(ConstraintViolationException.class)
  public ResponseEntity<ApiResponse<Void>> handleConstraintViolation(
      ConstraintViolationException ex) {
    String parameter =
        ex.getConstraintViolations().stream()
            .findFirst()
            .map(violation -> lastPathNode(violation.getPropertyPath().toString()))
            .orElse("request");
    return ResponseEntity.status(HttpStatus.BAD_REQUEST)
        .body(
            ApiResponse.error(
                ApiError.of(
                    HttpStatus.BAD_REQUEST, "Invalid value for parameter '" + parameter + "'")));
  }

  private static String lastPathNode(String propertyPath) {
    int lastDot = propertyPath.lastIndexOf('.');
    return lastDot >= 0 ? propertyPath.substring(lastDot + 1) : propertyPath;
  }

  @ExceptionHandler(MethodArgumentTypeMismatchException.class)
  public ResponseEntity<ApiResponse<Void>> handleArgumentTypeMismatch(
      MethodArgumentTypeMismatchException ex) {
    return ResponseEntity.status(HttpStatus.BAD_REQUEST)
        .body(
            ApiResponse.error(
                ApiError.of(
                    HttpStatus.BAD_REQUEST, "Invalid value for parameter '" + ex.getName() + "'")));
  }

  @ExceptionHandler(HttpMediaTypeNotSupportedException.class)
  public ResponseEntity<ApiResponse<Void>> handleMediaTypeNotSupported(
      HttpMediaTypeNotSupportedException ex) {
    BodyBuilder builder = ResponseEntity.status(HttpStatus.UNSUPPORTED_MEDIA_TYPE);
    // Advertise what the endpoint does accept, so the client can correct its Content-Type.
    List<MediaType> supportedTypes = ex.getSupportedMediaTypes();
    if (!CollectionUtils.isEmpty(supportedTypes)) {
      builder.headers(headers -> headers.setAccept(supportedTypes));
    }
    return builder.body(
        ApiResponse.error(
            ApiError.of(HttpStatus.UNSUPPORTED_MEDIA_TYPE, "Unsupported media type")));
  }

  /**
   * 406 is returned without a body on purpose. The client's {@code Accept} header cannot be
   * satisfied, so the JSON error envelope is not a representation it would accept — writing one
   * would fail content negotiation a second time, inside exception handling. This mirrors Spring's
   * own {@code ResponseEntityExceptionHandler}, and is the one documented exception to the
   * envelope-everywhere rule in {@code docs/impl/epics/unified-error-handling.md}.
   *
   * <p>Do not "improve" this by attaching a body. Without this handler the generic {@code
   * Exception} handler builds a 500 envelope, writing <em>that</em> fails negotiation too, and the
   * exception escapes the DispatcherServlet into the container's error dispatch — which re-enters
   * the security filter chain with an empty SecurityContext and answers <b>401</b>. A bogus 401 on
   * a perfectly authenticated request is a long debugging detour; the empty 406 avoids it.
   */
  @ExceptionHandler(HttpMediaTypeNotAcceptableException.class)
  public ResponseEntity<ApiResponse<Void>> handleMediaTypeNotAcceptable(
      HttpMediaTypeNotAcceptableException ex) {
    return ResponseEntity.status(HttpStatus.NOT_ACCEPTABLE).build();
  }

  @ExceptionHandler(Exception.class)
  public ResponseEntity<ApiResponse<Void>> handleGenericError(Exception ex) {
    log.error("Unhandled exception", ex);
    return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
        .body(ApiResponse.error(ApiError.internalError()));
  }

  private String getEntityNotFoundMessage(String entityType) {
    return switch (entityType) {
      case "DeviceType" -> "Device type not found";
      case "Context" -> "Context not found";
      case "RepairType" -> "Repair type not found";
      case "Assignment" -> "Assignment not found";
      case "Engineer" -> "Engineer not found";
      default -> "Resource not found";
    };
  }
}
