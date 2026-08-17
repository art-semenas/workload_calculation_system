package com.workload.config;

import com.workload.entity.Role;
import org.springframework.core.convert.converter.Converter;
import org.springframework.stereotype.Component;

/**
 * Query parameters spell roles the way the API does — {@code ?role=viewer}, not {@code VIEWER}.
 * Spring's default enum binding matches constant names only, so an unconverted {@code role=viewer}
 * would 400 on a perfectly valid request. Unknown values still raise the type-mismatch 400.
 */
@Component
public class StringToRoleConverter implements Converter<String, Role> {

  @Override
  public Role convert(String source) {
    return Role.fromValue(source);
  }
}
