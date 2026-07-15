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

  @ExceptionHandler(EntityNotFoundException.class)
  public ResponseEntity<ApiResponse<Void>> handleEntityNotFound(EntityNotFoundException ex) {
    return ResponseEntity.status(HttpStatus.NOT_FOUND)
        .body(
            ApiResponse.error(
                ApiError.of(HttpStatus.NOT_FOUND, getEntityNotFoundMessage(ex.getEntityType()))));
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
    return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
        .body(
            ApiResponse.error(
                ApiError.of(HttpStatus.UNAUTHORIZED, "Invalid or expired authentication token")));
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
        .body(
            ApiResponse.error(
                ApiError.of(HttpStatus.UNAUTHORIZED, "Invalid or expired authentication token")));
  }

  @ExceptionHandler(AccessDeniedException.class)
  public ResponseEntity<ApiResponse<Void>> handleAccessDenied(AccessDeniedException ex) {
    return ResponseEntity.status(HttpStatus.FORBIDDEN)
        .body(
            ApiResponse.error(
                ApiError.of(
                    HttpStatus.FORBIDDEN, "You don't have permission to access this resource")));
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
