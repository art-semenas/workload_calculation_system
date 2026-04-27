package com.workload.exception;

public class AssignmentNotFoundException extends RuntimeException {
  public AssignmentNotFoundException(String objectId, String engineerId) {
    super("Assignment not found: objectId=" + objectId + ", engineerId=" + engineerId);
  }
}
