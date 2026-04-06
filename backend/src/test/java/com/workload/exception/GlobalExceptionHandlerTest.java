package com.workload.exception;

import static org.assertj.core.api.Assertions.assertThat;

import com.workload.dto.ApiResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.BadCredentialsException;

class GlobalExceptionHandlerTest {

  private GlobalExceptionHandler handler;

  @BeforeEach
  void setUp() {
    handler = new GlobalExceptionHandler();
  }

  @Test
  void genericEntityNotFoundReturns404() {
    ResponseEntity<ApiResponse<Void>> response =
        handler.handleEntityNotFound(new EntityNotFoundException("DeviceType", "abc"));
    assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
    assertThat(response.getBody().error().code()).isEqualTo("NOT_FOUND");
    assertThat(response.getBody().error().message()).isEqualTo("Device type not found");
  }

  @Test
  void divisionNotFoundReturnsTorCode() {
    ResponseEntity<ApiResponse<Void>> response =
        handler.handleDivisionNotFound(new DivisionNotFoundException("abc"));
    assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
    assertThat(response.getBody().error().code()).isEqualTo("NOT_FOUND");
    assertThat(response.getBody().error().message()).isEqualTo("Division not found");
  }

  @Test
  void branchNotFoundReturnsTorCode() {
    ResponseEntity<ApiResponse<Void>> response =
        handler.handleBranchNotFound(new BranchNotFoundException("abc"));
    assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
    assertThat(response.getBody().error().code()).isEqualTo("NOT_FOUND");
    assertThat(response.getBody().error().message()).isEqualTo("Branch not found");
  }

  @Test
  void objectNotFoundReturnsTorCode() {
    ResponseEntity<ApiResponse<Void>> response =
        handler.handleObjectNotFound(new ObjectNotFoundException("abc"));
    assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
    assertThat(response.getBody().error().code()).isEqualTo("OBJECT_NOT_FOUND");
    assertThat(response.getBody().error().message()).isEqualTo("Object not found");
  }

  @Test
  void summaryNotFoundReturns404WithSpecificCode() {
    ResponseEntity<ApiResponse<Void>> response =
        handler.handleSummaryNotFound(new SummaryNotFoundException("abc"));
    assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
    assertThat(response.getBody().error().code()).isEqualTo("SUMMARY_NOT_FOUND");
  }

  @Test
  void dataIntegrityViolationWithDuplicateReturnsNameConflict() {
    ResponseEntity<ApiResponse<Void>> response =
        handler.handleDataIntegrityViolation(new DataIntegrityViolationException("duplicate key"));
    assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
    assertThat(response.getBody().error().code()).isEqualTo("NAME_CONFLICT");
  }

  @Test
  void dataIntegrityViolationWithUniqueReturnsNameConflict() {
    ResponseEntity<ApiResponse<Void>> response =
        handler.handleDataIntegrityViolation(
            new DataIntegrityViolationException("unique constraint violated"));
    assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
    assertThat(response.getBody().error().code()).isEqualTo("NAME_CONFLICT");
  }

  @Test
  void dataIntegrityViolationGenericReturnsConstraintViolation() {
    ResponseEntity<ApiResponse<Void>> response =
        handler.handleDataIntegrityViolation(
            new DataIntegrityViolationException("foreign key constraint"));
    assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
    assertThat(response.getBody().error().code()).isEqualTo("CONSTRAINT_VIOLATION");
  }

  @Test
  void deviceNotInInventoryReturns422() {
    ResponseEntity<ApiResponse<Void>> response =
        handler.handleDeviceNotInInventory(new DeviceNotInInventoryException("dev-1"));
    assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNPROCESSABLE_ENTITY);
    assertThat(response.getBody().error().code()).isEqualTo("DEVICE_NOT_IN_INVENTORY");
  }

  @Test
  void noContextForSystemReturns422() {
    ResponseEntity<ApiResponse<Void>> response =
        handler.handleNoContextForSystem(new NoContextForSystemException("OS"));
    assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNPROCESSABLE_ENTITY);
    assertThat(response.getBody().error().code()).isEqualTo("NO_CONTEXT_FOR_SYSTEM");
  }

  @Test
  void roundTripNotEditableReturns422() {
    ResponseEntity<ApiResponse<Void>> response =
        handler.handleRoundTripNotEditable(new RoundTripNotEditableException());
    assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNPROCESSABLE_ENTITY);
    assertThat(response.getBody().error().code()).isEqualTo("ROUND_TRIP_NOT_EDITABLE");
  }

  @Test
  void invalidCredentialsReturns401() {
    ResponseEntity<ApiResponse<Void>> response =
        handler.handleInvalidCredentials(new InvalidCredentialsException());
    assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    assertThat(response.getBody().error().code()).isEqualTo("INVALID_CREDENTIALS");
  }

  @Test
  void badCredentialsReturns401() {
    ResponseEntity<ApiResponse<Void>> response =
        handler.handleBadCredentials(new BadCredentialsException("bad"));
    assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    assertThat(response.getBody().error().code()).isEqualTo("INVALID_CREDENTIALS");
  }

  @Test
  void accessDeniedReturns403() {
    ResponseEntity<ApiResponse<Void>> response =
        handler.handleAccessDenied(new AccessDeniedException("denied"));
    assertThat(response.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
    assertThat(response.getBody().error().code()).isEqualTo("ACCESS_DENIED");
  }

  @Test
  void unhandledRuntimeExceptionReturns500() {
    ResponseEntity<ApiResponse<Void>> response =
        handler.handleUnhandledException(new RuntimeException("oops"));
    assertThat(response.getStatusCode()).isEqualTo(HttpStatus.INTERNAL_SERVER_ERROR);
    assertThat(response.getBody().error().code()).isEqualTo("INTERNAL_ERROR");
  }
}
