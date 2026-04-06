package com.workload.exception;

public class EntityNotFoundException extends RuntimeException {
  private final String entityType;

  public EntityNotFoundException(String entityType, String identifier) {
    super(entityType + " not found: " + identifier);
    this.entityType = entityType;
  }

  public String getEntityType() {
    return entityType;
  }
}
