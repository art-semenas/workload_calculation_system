package com.workload.entity;

import com.fasterxml.jackson.annotation.JsonValue;

public enum Role {
  ADMIN("admin"),
  EDITOR("editor"),
  ENGINEER("engineer"),
  VIEWER("viewer");

  private final String value;

  Role(String value) {
    this.value = value;
  }

  @JsonValue
  public String getValue() {
    return value;
  }

  public static Role fromValue(String value) {
    for (Role role : values()) {
      if (role.value.equalsIgnoreCase(value)) {
        return role;
      }
    }
    throw new IllegalArgumentException("Unknown role: " + value);
  }
}
