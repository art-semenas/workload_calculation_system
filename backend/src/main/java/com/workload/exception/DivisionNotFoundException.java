package com.workload.exception;

public class DivisionNotFoundException extends EntityNotFoundException {
    public DivisionNotFoundException(String identifier) {
        super("Division", identifier);
    }
}
