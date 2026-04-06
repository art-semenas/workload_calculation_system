package com.workload.exception;

public class DeviceTypeInUseException extends RuntimeException {
  public DeviceTypeInUseException(String deviceTypeId) {
    super("Device type " + deviceTypeId + " is in use by object inventory");
  }
}
