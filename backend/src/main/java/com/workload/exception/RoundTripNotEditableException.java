package com.workload.exception;

public class RoundTripNotEditableException extends RuntimeException {
  public RoundTripNotEditableException() {
    super("round_trip_min is computed and cannot be set directly");
  }
}
