package com.workload.exception;

public class NoContextForSystemException extends RuntimeException {
  public NoContextForSystemException(String systemType) {
    super("No context found for system type: " + systemType);
  }
}
