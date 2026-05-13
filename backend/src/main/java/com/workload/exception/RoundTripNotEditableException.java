package com.workload.exception;

public class RoundTripNotEditableException extends RuntimeException {
  public RoundTripNotEditableException() {
    super("Round trip time is auto-calculated and cannot be edited directly");
  }
}
