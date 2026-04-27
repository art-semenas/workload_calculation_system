package com.workload.exception;

import com.workload.dto.ApiError;
import com.workload.dto.ApiResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class GlobalExceptionHandler {

  private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

  @ExceptionHandler(SummaryNotFoundException.class)
  public ResponseEntity<ApiResponse<Void>> handleSummaryNotFound(SummaryNotFoundException ex) {
    return ResponseEntity.status(HttpStatus.NOT_FOUND)
        .body(ApiResponse.error(new ApiError("SUMMARY_NOT_FOUND", ex.getMessage(), null)));
  }

  @ExceptionHandler(DivisionNotFoundException.class)
  public ResponseEntity<ApiResponse<Void>> handleDivisionNotFound(DivisionNotFoundException ex) {
    return ResponseEntity.status(HttpStatus.NOT_FOUND)
        .body(ApiResponse.error(new ApiError("NOT_FOUND", "Division not found", null)));
  }

  @ExceptionHandler(BranchNotFoundException.class)
  public ResponseEntity<ApiResponse<Void>> handleBranchNotFound(BranchNotFoundException ex) {
    return ResponseEntity.status(HttpStatus.NOT_FOUND)
        .body(ApiResponse.error(new ApiError("NOT_FOUND", "Branch not found", null)));
  }

  @ExceptionHandler(ObjectNotFoundException.class)
  public ResponseEntity<ApiResponse<Void>> handleObjectNotFound(ObjectNotFoundException ex) {
    return ResponseEntity.status(HttpStatus.NOT_FOUND)
        .body(ApiResponse.error(new ApiError("OBJECT_NOT_FOUND", "Object not found", null)));
  }

  @ExceptionHandler(EntityNotFoundException.class)
  public ResponseEntity<ApiResponse<Void>> handleEntityNotFound(EntityNotFoundException ex) {
    return ResponseEntity.status(HttpStatus.NOT_FOUND)
        .body(
            ApiResponse.error(
                new ApiError(
                    getEntityNotFoundCode(ex.getEntityType()),
                    getEntityNotFoundMessage(ex.getEntityType()),
                    null)));
  }

  @ExceptionHandler(EngineerHasActiveAssignmentsException.class)
  public ResponseEntity<ApiResponse<Void>> handleEngineerHasActiveAssignments(
      EngineerHasActiveAssignmentsException ex) {
    return ResponseEntity.status(HttpStatus.CONFLICT)
        .body(
            ApiResponse.error(
                new ApiError("ENGINEER_HAS_ACTIVE_ASSIGNMENTS", ex.getMessage(), null)));
  }

  @ExceptionHandler(EngineerInactiveException.class)
  public ResponseEntity<ApiResponse<Void>> handleEngineerInactive(EngineerInactiveException ex) {
    return ResponseEntity.status(HttpStatus.UNPROCESSABLE_ENTITY)
        .body(ApiResponse.error(new ApiError("ENGINEER_INACTIVE", ex.getMessage(), null)));
  }

  @ExceptionHandler(InvalidEngineerRoleException.class)
  public ResponseEntity<ApiResponse<Void>> handleInvalidEngineerRole(
      InvalidEngineerRoleException ex) {
    return ResponseEntity.status(HttpStatus.UNPROCESSABLE_ENTITY)
        .body(ApiResponse.error(new ApiError("INVALID_ENGINEER_ROLE", ex.getMessage(), null)));
  }

  @ExceptionHandler(AssignmentNotFoundException.class)
  public ResponseEntity<ApiResponse<Void>> handleAssignmentNotFound(
      AssignmentNotFoundException ex) {
    return ResponseEntity.status(HttpStatus.NOT_FOUND)
        .body(ApiResponse.error(new ApiError("ASSIGNMENT_NOT_FOUND", ex.getMessage(), null)));
  }

  @ExceptionHandler(DataIntegrityViolationException.class)
  public ResponseEntity<ApiResponse<Void>> handleDataIntegrityViolation(
      DataIntegrityViolationException ex) {
    String msg = ex.getMessage() != null ? ex.getMessage().toLowerCase() : "";
    // Check if it's an object-engineer assignment constraint violation
    if (msg.contains("uq_oe_object_engineer")) {
      return ResponseEntity.status(HttpStatus.CONFLICT)
          .body(
              ApiResponse.error(
                  new ApiError(
                      "CONSTRAINT_VIOLATION", "A database constraint was violated", null)));
    }
    if (msg.contains("unique") || msg.contains("duplicate")) {
      return ResponseEntity.status(HttpStatus.CONFLICT)
          .body(
              ApiResponse.error(
                  new ApiError("NAME_CONFLICT", "A record with that name already exists", null)));
    }
    return ResponseEntity.status(HttpStatus.CONFLICT)
        .body(
            ApiResponse.error(
                new ApiError("CONSTRAINT_VIOLATION", "A database constraint was violated", null)));
  }

  @ExceptionHandler(DeviceNotInInventoryException.class)
  public ResponseEntity<ApiResponse<Void>> handleDeviceNotInInventory(
      DeviceNotInInventoryException ex) {
    return ResponseEntity.status(HttpStatus.UNPROCESSABLE_ENTITY)
        .body(ApiResponse.error(new ApiError("DEVICE_NOT_IN_INVENTORY", ex.getMessage(), null)));
  }

  @ExceptionHandler(NoContextForSystemException.class)
  public ResponseEntity<ApiResponse<Void>> handleNoContextForSystem(
      NoContextForSystemException ex) {
    return ResponseEntity.status(HttpStatus.UNPROCESSABLE_ENTITY)
        .body(ApiResponse.error(new ApiError("NO_CONTEXT_FOR_SYSTEM", ex.getMessage(), null)));
  }

  @ExceptionHandler(RoundTripNotEditableException.class)
  public ResponseEntity<ApiResponse<Void>> handleRoundTripNotEditable(
      RoundTripNotEditableException ex) {
    return ResponseEntity.status(HttpStatus.UNPROCESSABLE_ENTITY)
        .body(ApiResponse.error(new ApiError("ROUND_TRIP_NOT_EDITABLE", ex.getMessage(), null)));
  }

  @ExceptionHandler(RequestValidationException.class)
  public ResponseEntity<ApiResponse<Void>> handleRequestValidation(RequestValidationException ex) {
    return ResponseEntity.status(HttpStatus.UNPROCESSABLE_ENTITY)
        .body(ApiResponse.error(new ApiError("VALIDATION_ERROR", ex.getMessage(), null)));
  }

  @ExceptionHandler(HttpMessageNotReadableException.class)
  public ResponseEntity<ApiResponse<Void>> handleMessageNotReadable(
      HttpMessageNotReadableException ex) {
    return ResponseEntity.status(HttpStatus.UNPROCESSABLE_ENTITY)
        .body(ApiResponse.error(new ApiError("VALIDATION_ERROR", "Invalid request body", null)));
  }

  @ExceptionHandler(MethodArgumentNotValidException.class)
  public ResponseEntity<ApiResponse<Void>> handleValidation(MethodArgumentNotValidException ex) {
    String message =
        ex.getBindingResult().getFieldErrors().stream()
            .map(fe -> fe.getField() + ": " + fe.getDefaultMessage())
            .reduce((a, b) -> a + "; " + b)
            .orElse("Validation failed");
    return ResponseEntity.status(HttpStatus.UNPROCESSABLE_ENTITY)
        .body(ApiResponse.error(new ApiError("VALIDATION_ERROR", message, null)));
  }

  @ExceptionHandler(InvalidCredentialsException.class)
  public ResponseEntity<ApiResponse<Void>> handleInvalidCredentials(
      InvalidCredentialsException ex) {
    return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
        .body(ApiResponse.error(new ApiError("INVALID_CREDENTIALS", ex.getMessage(), null)));
  }

  @ExceptionHandler(DeviceTypeInUseException.class)
  public ResponseEntity<ApiResponse<Void>> handleDeviceTypeInUse(DeviceTypeInUseException ex) {
    return ResponseEntity.status(HttpStatus.CONFLICT)
        .body(ApiResponse.error(new ApiError("DEVICE_IN_USE", ex.getMessage(), null)));
  }

  @ExceptionHandler(DeviceInUseException.class)
  public ResponseEntity<ApiResponse<Void>> handleDeviceInUse(DeviceInUseException ex) {
    return ResponseEntity.status(HttpStatus.CONFLICT)
        .body(ApiResponse.error(new ApiError("INVENTORY_DEVICE_IN_USE", ex.getMessage(), null)));
  }

  @ExceptionHandler(ContextInUseException.class)
  public ResponseEntity<ApiResponse<Void>> handleContextInUse(ContextInUseException ex) {
    return ResponseEntity.status(HttpStatus.CONFLICT)
        .body(ApiResponse.error(new ApiError("CONTEXT_IN_USE", ex.getMessage(), null)));
  }

  @ExceptionHandler(RepairTypeInUseException.class)
  public ResponseEntity<ApiResponse<Void>> handleRepairTypeInUse(RepairTypeInUseException ex) {
    return ResponseEntity.status(HttpStatus.CONFLICT)
        .body(ApiResponse.error(new ApiError("REPAIR_TYPE_IN_USE", ex.getMessage(), null)));
  }

  @ExceptionHandler(BadCredentialsException.class)
  public ResponseEntity<ApiResponse<Void>> handleBadCredentials(BadCredentialsException ex) {
    return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
        .body(
            ApiResponse.error(
                new ApiError("INVALID_CREDENTIALS", "Invalid email or password", null)));
  }

  @ExceptionHandler(AccessDeniedException.class)
  public ResponseEntity<ApiResponse<Void>> handleAccessDenied(AccessDeniedException ex) {
    return ResponseEntity.status(HttpStatus.FORBIDDEN)
        .body(ApiResponse.error(new ApiError("ACCESS_DENIED", ex.getMessage(), null)));
  }

  @ExceptionHandler(RuntimeException.class)
  public ResponseEntity<ApiResponse<Void>> handleUnhandledException(RuntimeException ex) {
    log.error("Unhandled exception", ex);
    return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
        .body(
            ApiResponse.error(
                new ApiError("INTERNAL_ERROR", "An unexpected error occurred", null)));
  }

  private String getEntityNotFoundCode(String entityType) {
    return switch (entityType) {
      case "Engineer" -> "ENGINEER_NOT_FOUND";
      default -> "NOT_FOUND";
    };
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
