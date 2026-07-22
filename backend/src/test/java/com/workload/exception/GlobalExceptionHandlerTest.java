package com.workload.exception;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.workload.dto.ApiResponse;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.validation.BindingResult;
import org.springframework.validation.FieldError;
import org.springframework.web.HttpMediaTypeNotAcceptableException;
import org.springframework.web.HttpMediaTypeNotSupportedException;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

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
    assertThat(response.getBody().error().code()).isEqualTo(404);
    assertThat(response.getBody().error().message()).isEqualTo("Device type not found");
  }

  @Test
  void divisionNotFoundReturnsTorCode() {
    ResponseEntity<ApiResponse<Void>> response =
        handler.handleDivisionNotFound(new DivisionNotFoundException("abc"));
    assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
    assertThat(response.getBody().error().code()).isEqualTo(404);
    assertThat(response.getBody().error().message()).isEqualTo("Division not found");
  }

  @Test
  void branchNotFoundReturnsTorCode() {
    ResponseEntity<ApiResponse<Void>> response =
        handler.handleBranchNotFound(new BranchNotFoundException("abc"));
    assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
    assertThat(response.getBody().error().code()).isEqualTo(404);
    assertThat(response.getBody().error().message()).isEqualTo("Branch not found");
  }

  @Test
  void objectNotFoundReturnsTorCode() {
    ResponseEntity<ApiResponse<Void>> response =
        handler.handleObjectNotFound(new ObjectNotFoundException("abc"));
    assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
    assertThat(response.getBody().error().code()).isEqualTo(404);
    assertThat(response.getBody().error().message()).isEqualTo("Object not found");
  }

  @Test
  void summaryNotFoundReturns404() {
    ResponseEntity<ApiResponse<Void>> response =
        handler.handleSummaryNotFound(new SummaryNotFoundException("abc"));
    assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
    assertThat(response.getBody().error().code()).isEqualTo(404);
  }

  @Test
  void dataIntegrityViolationWithDuplicateReturns409() {
    ResponseEntity<ApiResponse<Void>> response =
        handler.handleDataIntegrityViolation(new DataIntegrityViolationException("duplicate key"));
    assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
    assertThat(response.getBody().error().code()).isEqualTo(409);
  }

  @Test
  void dataIntegrityViolationWithUniqueReturns409() {
    ResponseEntity<ApiResponse<Void>> response =
        handler.handleDataIntegrityViolation(
            new DataIntegrityViolationException("unique constraint violated"));
    assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
    assertThat(response.getBody().error().code()).isEqualTo(409);
  }

  @Test
  void dataIntegrityViolationGenericReturns409() {
    ResponseEntity<ApiResponse<Void>> response =
        handler.handleDataIntegrityViolation(
            new DataIntegrityViolationException("foreign key constraint"));
    assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
    assertThat(response.getBody().error().code()).isEqualTo(409);
  }

  @Test
  void deviceNotInInventoryReturns422() {
    ResponseEntity<ApiResponse<Void>> response =
        handler.handleDeviceNotInInventory(new DeviceNotInInventoryException("dev-1"));
    assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNPROCESSABLE_ENTITY);
    assertThat(response.getBody().error().code()).isEqualTo(422);
  }

  @Test
  void noContextForSystemReturns422() {
    ResponseEntity<ApiResponse<Void>> response =
        handler.handleNoContextForSystem(new NoContextForSystemException("OS"));
    assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNPROCESSABLE_ENTITY);
    assertThat(response.getBody().error().code()).isEqualTo(422);
  }

  @Test
  void roundTripNotEditableReturns422() {
    ResponseEntity<ApiResponse<Void>> response =
        handler.handleRoundTripNotEditable(new RoundTripNotEditableException());
    assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNPROCESSABLE_ENTITY);
    assertThat(response.getBody().error().code()).isEqualTo(422);
  }

  @Test
  void contextInUseMapsTo409() {
    ResponseEntity<ApiResponse<Void>> response =
        handler.handleContextInUse(new ContextInUseException(3));
    assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
    assertThat(response.getBody().error().code()).isEqualTo(409);
  }

  @Test
  void methodArgNotValidMapsTo422WithFieldErrors() {
    MethodArgumentNotValidException ex = mock(MethodArgumentNotValidException.class);
    BindingResult bindingResult = mock(BindingResult.class);
    when(ex.getBindingResult()).thenReturn(bindingResult);
    when(bindingResult.getFieldErrors())
        .thenReturn(List.of(new FieldError("obj", "name", "must not be blank")));
    ResponseEntity<ApiResponse<Void>> response = handler.handleValidation(ex);
    assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNPROCESSABLE_ENTITY);
    assertThat(response.getBody().error().code()).isEqualTo(422);
    assertThat(response.getBody().error().message()).contains("name").contains("must not be blank");
  }

  @Test
  void httpMessageNotReadableMapsTo400() {
    HttpMessageNotReadableException ex = mock(HttpMessageNotReadableException.class);
    ResponseEntity<ApiResponse<Void>> response = handler.handleMessageNotReadable(ex);
    assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
    assertThat(response.getBody().error().code()).isEqualTo(400);
    assertThat(response.getBody().error().message()).isEqualTo("Malformed request body");
  }

  @Test
  void invalidCredentialsReturns401() {
    ResponseEntity<ApiResponse<Void>> response =
        handler.handleInvalidCredentials(new InvalidCredentialsException());
    assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    assertThat(response.getBody().error().code()).isEqualTo(401);
    assertThat(response.getBody().error().message()).isEqualTo("Invalid email or password");
  }

  @Test
  void badCredentialsReturns401() {
    ResponseEntity<ApiResponse<Void>> response =
        handler.handleBadCredentials(new BadCredentialsException("bad"));
    assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    assertThat(response.getBody().error().code()).isEqualTo(401);
    assertThat(response.getBody().error().message()).isEqualTo("Invalid email or password");
  }

  @Test
  void accessDeniedReturns403() {
    ResponseEntity<ApiResponse<Void>> response =
        handler.handleAccessDenied(new AccessDeniedException("denied"));
    assertThat(response.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
    assertThat(response.getBody().error().code()).isEqualTo(403);
  }

  @Test
  void noResourceFoundMapsTo404() {
    ResponseEntity<ApiResponse<Void>> response =
        handler.handleNoResourceFound(
            new NoResourceFoundException(HttpMethod.GET, "/api/v1/nonexistent-path"));
    assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
    assertThat(response.getBody().error().code()).isEqualTo(404);
    assertThat(response.getBody().error().message()).isEqualTo("Resource not found");
  }

  @Test
  void methodNotSupportedMapsTo405() {
    ResponseEntity<ApiResponse<Void>> response =
        handler.handleMethodNotSupported(new HttpRequestMethodNotSupportedException("DELETE"));
    assertThat(response.getStatusCode()).isEqualTo(HttpStatus.METHOD_NOT_ALLOWED);
    assertThat(response.getBody().error().code()).isEqualTo(405);
    assertThat(response.getBody().error().message()).isEqualTo("Method not allowed");
  }

  /** RFC 9110 §15.5.6: a 405 response must advertise the methods the resource does support. */
  @Test
  void methodNotSupportedSetsAllowHeader() {
    ResponseEntity<ApiResponse<Void>> response =
        handler.handleMethodNotSupported(
            new HttpRequestMethodNotSupportedException("DELETE", List.of("GET", "POST")));
    assertThat(response.getStatusCode()).isEqualTo(HttpStatus.METHOD_NOT_ALLOWED);
    assertThat(response.getHeaders().getAllow())
        .containsExactlyInAnyOrder(HttpMethod.GET, HttpMethod.POST);
  }

  @Test
  void methodNotSupportedWithoutSupportedMethodsOmitsAllowHeader() {
    ResponseEntity<ApiResponse<Void>> response =
        handler.handleMethodNotSupported(new HttpRequestMethodNotSupportedException("DELETE"));
    assertThat(response.getStatusCode()).isEqualTo(HttpStatus.METHOD_NOT_ALLOWED);
    assertThat(response.getHeaders().getAllow()).isEmpty();
  }

  @Test
  void missingRequestParameterMapsTo400WithParameterName() {
    ResponseEntity<ApiResponse<Void>> response =
        handler.handleMissingRequestParameter(
            new MissingServletRequestParameterException("branchId", "UUID"));
    assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
    assertThat(response.getBody().error().code()).isEqualTo(400);
    assertThat(response.getBody().error().message())
        .isEqualTo("Missing required parameter: branchId");
  }

  @Test
  void argumentTypeMismatchMapsTo400WithParameterName() {
    ResponseEntity<ApiResponse<Void>> response =
        handler.handleArgumentTypeMismatch(
            new MethodArgumentTypeMismatchException(
                "not-a-uuid", UUID.class, "id", null, new IllegalArgumentException("bad uuid")));
    assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
    assertThat(response.getBody().error().code()).isEqualTo(400);
    assertThat(response.getBody().error().message()).isEqualTo("Invalid value for parameter 'id'");
  }

  @Test
  void unsupportedMediaTypeMapsTo415() {
    ResponseEntity<ApiResponse<Void>> response =
        handler.handleMediaTypeNotSupported(
            new HttpMediaTypeNotSupportedException(
                MediaType.TEXT_PLAIN, List.of(MediaType.APPLICATION_JSON)));
    assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNSUPPORTED_MEDIA_TYPE);
    assertThat(response.getBody().error().code()).isEqualTo(415);
    assertThat(response.getBody().error().message()).isEqualTo("Unsupported media type");
  }

  /** A 415 response should advertise the media types the endpoint does accept. */
  @Test
  void unsupportedMediaTypeSetsAcceptHeader() {
    ResponseEntity<ApiResponse<Void>> response =
        handler.handleMediaTypeNotSupported(
            new HttpMediaTypeNotSupportedException(
                MediaType.TEXT_PLAIN, List.of(MediaType.APPLICATION_JSON)));
    assertThat(response.getHeaders().getAccept()).containsExactly(MediaType.APPLICATION_JSON);
  }

  @Test
  void unsupportedMediaTypeWithoutSupportedTypesOmitsAcceptHeader() {
    ResponseEntity<ApiResponse<Void>> response =
        handler.handleMediaTypeNotSupported(
            new HttpMediaTypeNotSupportedException("no converter for text/plain"));
    assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNSUPPORTED_MEDIA_TYPE);
    assertThat(response.getHeaders().getAccept()).isEmpty();
  }

  @Test
  void mediaTypeNotAcceptableMapsTo406() {
    ResponseEntity<ApiResponse<Void>> response =
        handler.handleMediaTypeNotAcceptable(
            new HttpMediaTypeNotAcceptableException(List.of(MediaType.APPLICATION_JSON)));
    assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_ACCEPTABLE);
    assertThat(response.getBody()).isNull();
  }

  @Test
  void genericExceptionMapsTo500WithoutDetails() {
    ResponseEntity<ApiResponse<Void>> response =
        handler.handleGenericError(new RuntimeException("internal stacktrace detail"));
    assertThat(response.getStatusCode()).isEqualTo(HttpStatus.INTERNAL_SERVER_ERROR);
    assertThat(response.getBody().error().code()).isEqualTo(500);
    assertThat(response.getBody().error().message())
        .doesNotContain("stacktrace")
        .isEqualTo("An unexpected error occurred. Please try again later.");
  }
}
