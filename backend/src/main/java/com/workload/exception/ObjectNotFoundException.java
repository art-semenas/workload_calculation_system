package com.workload.exception;

public class ObjectNotFoundException extends EntityNotFoundException {
    public ObjectNotFoundException(String identifier) {
        super("Object", identifier);
    }
}
