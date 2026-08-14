package com.workload.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.when;

import com.workload.dto.AuthTokens;
import com.workload.dto.LoginRequest;
import com.workload.entity.Role;
import com.workload.entity.User;
import com.workload.exception.InvalidCredentialsException;
import com.workload.mapper.UserMapper;
import com.workload.repository.UserRepository;
import com.workload.security.JwtTokenProvider;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

  @Mock private UserRepository userRepository;
  @Mock private PasswordEncoder passwordEncoder;
  @Mock private JwtTokenProvider jwtTokenProvider;
  @Mock private UserMapper userMapper;
  @InjectMocks private AuthService authService;

  @Test
  void loginReturnsTokenForValidCredentials() {
    User user =
        User.builder()
            .id(UUID.randomUUID())
            .email("admin@workload.local")
            .passwordHash("hashed")
            .role(Role.ADMIN)
            .active(true)
            .build();

    when(userRepository.findByEmail("admin@workload.local")).thenReturn(Optional.of(user));
    when(passwordEncoder.matches("password", "hashed")).thenReturn(true);
    when(jwtTokenProvider.generateToken(user)).thenReturn("jwt-token");
    when(jwtTokenProvider.generateRefreshToken(user)).thenReturn("refresh-token");

    AuthTokens tokens = authService.login(new LoginRequest("admin@workload.local", "password"));

    assertThat(tokens.accessToken()).isEqualTo("jwt-token");
    assertThat(tokens.refreshToken()).isEqualTo("refresh-token");
  }

  @Test
  void loginThrowsForUnknownEmail() {
    when(userRepository.findByEmail("bad@email.com")).thenReturn(Optional.empty());

    assertThatThrownBy(() -> authService.login(new LoginRequest("bad@email.com", "pw")))
        .isInstanceOf(InvalidCredentialsException.class);
  }

  @Test
  void loginThrowsForWrongPassword() {
    User user =
        User.builder()
            .id(UUID.randomUUID())
            .email("admin@workload.local")
            .passwordHash("hashed")
            .role(Role.ADMIN)
            .active(true)
            .build();

    when(userRepository.findByEmail("admin@workload.local")).thenReturn(Optional.of(user));
    when(passwordEncoder.matches("wrong", "hashed")).thenReturn(false);

    assertThatThrownBy(() -> authService.login(new LoginRequest("admin@workload.local", "wrong")))
        .isInstanceOf(InvalidCredentialsException.class);
  }

  @Test
  void loginThrowsForInactiveUser() {
    User user =
        User.builder()
            .id(UUID.randomUUID())
            .email("inactive@workload.local")
            .passwordHash("hashed")
            .role(Role.VIEWER)
            .active(false)
            .build();

    when(userRepository.findByEmail("inactive@workload.local")).thenReturn(Optional.of(user));
    // Lenient: the filter guard fires before password check, so this stub is not invoked.
    // It exists to prove the test would fail if the .filter() guard were removed.
    lenient().when(passwordEncoder.matches("pw", "hashed")).thenReturn(true);

    assertThatThrownBy(() -> authService.login(new LoginRequest("inactive@workload.local", "pw")))
        .isInstanceOf(InvalidCredentialsException.class);
  }

  @Test
  void getMeReturnsUserDtoForKnownEmail() {
    User user =
        User.builder()
            .id(UUID.randomUUID())
            .email("admin@workload.local")
            .passwordHash("hashed")
            .role(Role.ADMIN)
            .active(true)
            .build();
    com.workload.dto.UserDto dto =
        new com.workload.dto.UserDto(
            user.getId(),
            "admin@workload.local",
            "PoC Admin",
            Role.ADMIN,
            null,
            null,
            java.math.BigDecimal.ONE,
            null,
            true,
            false);

    when(userRepository.findByEmail("admin@workload.local")).thenReturn(Optional.of(user));
    when(userMapper.toDto(user)).thenReturn(dto);

    com.workload.dto.UserDto result = authService.getMe("admin@workload.local");

    assertThat(result).isEqualTo(dto);
  }

  @Test
  void getMeThrowsForUnknownEmail() {
    when(userRepository.findByEmail("deleted@workload.local")).thenReturn(Optional.empty());

    assertThatThrownBy(() -> authService.getMe("deleted@workload.local"))
        .isInstanceOf(InvalidCredentialsException.class);
  }
}
