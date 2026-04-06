package com.workload.exception;

public class DeviceInUseException extends RuntimeException {
  public DeviceInUseException(String deviceTypeId) {
    super(
        "Device type "
            + deviceTypeId
            + " has active system assignments and cannot be removed from inventory");
  }
}
