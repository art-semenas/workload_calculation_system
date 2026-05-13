package com.workload.exception;

public class DeviceNotInInventoryException extends RuntimeException {
  public DeviceNotInInventoryException(String deviceTypeId) {
    super("Device not found in inventory for this object");
  }
}
