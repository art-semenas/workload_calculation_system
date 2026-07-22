package com.workload.dto;

import org.springframework.http.HttpStatus;

public record ApiError(int code, String message) {
  public static ApiError of(HttpStatus status, String message) {
    return new ApiError(status.value(), message);
  }

  public static ApiError conflict(String message) {
    return of(HttpStatus.CONFLICT, message);
  }

  public static ApiError validationError(String message) {
    return of(HttpStatus.UNPROCESSABLE_ENTITY, message);
  }

  public static ApiError internalError() {
    return of(
        HttpStatus.INTERNAL_SERVER_ERROR, "An unexpected error occurred. Please try again later.");
  }
}
