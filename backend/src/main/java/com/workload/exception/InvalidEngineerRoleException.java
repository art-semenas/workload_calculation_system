package com.workload.exception;

public class InvalidEngineerRoleException extends RuntimeException {
  public InvalidEngineerRoleException(String userId, String role) {
    super("User is not an engineer: " + userId + ", role=" + role);
  }
}
