package com.workload.exception;

public class BranchNotFoundException extends EntityNotFoundException {
  public BranchNotFoundException(String identifier) {
    super("Branch", identifier);
  }
}
