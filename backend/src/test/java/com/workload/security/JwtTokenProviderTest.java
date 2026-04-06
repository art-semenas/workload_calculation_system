package com.workload.security;

import static org.assertj.core.api.Assertions.assertThat;

import com.workload.entity.Role;
import com.workload.entity.User;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class JwtTokenProviderTest {

  private static final String SECRET = "test-secret-key-minimum-32-characters-long-for-hmac";
  private static final long EXPIRATION_MS = 86400000;

  private final JwtTokenProvider provider = new JwtTokenProvider(SECRET, EXPIRATION_MS);

  @Test
  void generateAndValidateToken() {
    User user =
        User.builder().id(UUID.randomUUID()).email("test@test.com").role(Role.ENGINEER).build();

    String token = provider.generateToken(user);

    assertThat(provider.isValidToken(token)).isTrue();
    assertThat(provider.getEmail(token)).isEqualTo("test@test.com");
  }

  @Test
  void invalidTokenReturnsFalse() {
    assertThat(provider.isValidToken("not-a-valid-token")).isFalse();
  }

  @Test
  void expiredTokenReturnsFalse() {
    JwtTokenProvider shortLived = new JwtTokenProvider(SECRET, -1000);
    User user =
        User.builder().id(UUID.randomUUID()).email("test@test.com").role(Role.ENGINEER).build();

    String token = shortLived.generateToken(user);

    assertThat(provider.isValidToken(token)).isFalse();
  }
}
