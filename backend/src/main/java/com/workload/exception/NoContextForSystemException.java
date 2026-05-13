package com.workload.exception;

public class NoContextForSystemException extends RuntimeException {
  public NoContextForSystemException(String systemType) {
    super("No norms configured for this system type");
  }
}
