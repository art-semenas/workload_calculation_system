package com.workload.exception;

public class EngineerInactiveException extends RuntimeException {
  public EngineerInactiveException(String engineerId) {
    super("Engineer is inactive: " + engineerId);
  }
}
