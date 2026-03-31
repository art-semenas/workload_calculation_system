package com.workload.exception;

public class DeviceNotInInventoryException extends RuntimeException {
    public DeviceNotInInventoryException(String deviceTypeId) {
        super("Device type not in inventory: " + deviceTypeId);
    }
}
