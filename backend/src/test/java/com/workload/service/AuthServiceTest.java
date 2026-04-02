package com.workload.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

import com.workload.dto.LoginRequest;
import com.workload.dto.LoginResponse;
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
    User user = User.builder()
        .id(UUID.randomUUID())
        .email("admin@workload.local")
        .passwordHash("hashed")
        .role(Role.ADMIN)
        .active(true)
        .build();

    when(userRepository.findByEmail("admin@workload.local")).thenReturn(Optional.of(user));
    when(passwordEncoder.matches("password", "hashed")).thenReturn(true);
    when(jwtTokenProvider.generateToken(user)).thenReturn("jwt-token");

    LoginResponse response = authService.login(new LoginRequest("admin@workload.local", "password"));

    assertThat(response.token()).isEqualTo("jwt-token");
  }

  @Test
  void loginThrowsForUnknownEmail() {
    when(userRepository.findByEmail("bad@email.com")).thenReturn(Optional.empty());

    assertThatThrownBy(() -> authService.login(new LoginRequest("bad@email.com", "pw")))
        .isInstanceOf(InvalidCredentialsException.class);
  }

  @Test
  void loginThrowsForWrongPassword() {
    User user = User.builder()
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
    User user = User.builder()
        .id(UUID.randomUUID())
        .email("inactive@workload.local")
        .passwordHash("hashed")
        .role(Role.VIEWER)
        .active(false)
        .build();

    when(userRepository.findByEmail("inactive@workload.local")).thenReturn(Optional.of(user));

    assertThatThrownBy(() -> authService.login(new LoginRequest("inactive@workload.local", "pw")))
        .isInstanceOf(InvalidCredentialsException.class);
  }
}
