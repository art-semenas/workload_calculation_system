package com.workload.exception;

public class EngineerHasActiveAssignmentsException extends RuntimeException {

  public EngineerHasActiveAssignmentsException(String engineerId) {
    super("Engineer has active assignments: " + engineerId);
  }
}
