package com.workload.exception;

import com.workload.dto.ApiError;
import com.workload.dto.ApiResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
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

  @ExceptionHandler(EntityNotFoundException.class)
  public ResponseEntity<ApiResponse<Void>> handleEntityNotFound(EntityNotFoundException ex) {
    return ResponseEntity.status(HttpStatus.NOT_FOUND)
        .body(ApiResponse.error(new ApiError("ENTITY_NOT_FOUND", ex.getMessage(), null)));
  }

  @ExceptionHandler(DataIntegrityViolationException.class)
  public ResponseEntity<ApiResponse<Void>> handleDataIntegrityViolation(
      DataIntegrityViolationException ex) {
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
}
