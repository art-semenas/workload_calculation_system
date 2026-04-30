package com.workload.constant;

import org.slf4j.LoggerFactory;

/** Engineer workload status enumeration. */
public enum WorkloadStatus {
  NORMAL("NORMAL"),
  WARNING("WARNING"),
  OVERLOADED("OVERLOADED");

  private final String value;

  WorkloadStatus(String value) {
    this.value = value;
  }

  public String getValue() {
    return value;
  }

  /** Parse status string (case-insensitive) to enum. */
  public static WorkloadStatus fromString(String value) {
    if (value == null) {
      return NORMAL;
    }
    for (WorkloadStatus status : WorkloadStatus.values()) {
      if (status.value.equalsIgnoreCase(value)) {
        return status;
      }
    }
    LoggerFactory.getLogger(WorkloadStatus.class)
        .warn("Unknown WorkloadStatus value '{}', defaulting to NORMAL", value);
    return NORMAL;
  }
}
