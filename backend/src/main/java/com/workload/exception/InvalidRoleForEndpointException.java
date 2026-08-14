package com.workload.exception;

/**
 * Engineer accounts carry capacity and summary state that {@code /admin/users} does not manage, so
 * they are created and promoted through {@code /engineers} only (epic MVP M-02).
 */
public class InvalidRoleForEndpointException extends RuntimeException {
  public InvalidRoleForEndpointException() {
    super("Engineer accounts cannot be created through this endpoint");
  }
}
