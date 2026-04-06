package com.workload.exception;

public class ContextInUseException extends RuntimeException {
  public ContextInUseException(String contextId) {
    super("Context " + contextId + " is in use by active system assignments");
  }
}
