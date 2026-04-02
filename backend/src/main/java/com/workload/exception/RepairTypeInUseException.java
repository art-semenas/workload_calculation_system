package com.workload.exception;

public class RepairTypeInUseException extends RuntimeException {
  public RepairTypeInUseException(String repairTypeId) {
    super("Repair type " + repairTypeId + " has recorded usage with count > 0");
  }
}
