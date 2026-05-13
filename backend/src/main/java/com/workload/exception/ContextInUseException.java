package com.workload.exception;

public class ContextInUseException extends RuntimeException {
  public ContextInUseException(long count) {
    super("Cannot delete: " + count + " object(s) use this context");
  }
}
