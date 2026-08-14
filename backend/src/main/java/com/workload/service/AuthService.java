package com.workload.service;

import com.workload.dto.AuthTokens;
import com.workload.dto.LoginRequest;
import com.workload.dto.UserDto;
import com.workload.entity.User;
import com.workload.exception.InvalidCredentialsException;
import com.workload.mapper.UserMapper;
import com.workload.repository.UserRepository;
import com.workload.security.JwtTokenProvider;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class AuthService {

  private final UserRepository userRepository;
  private final PasswordEncoder passwordEncoder;
  private final JwtTokenProvider jwtTokenProvider;
  private final UserMapper userMapper;

  public AuthService(
      UserRepository userRepository,
      PasswordEncoder passwordEncoder,
      JwtTokenProvider jwtTokenProvider,
      UserMapper userMapper) {
    this.userRepository = userRepository;
    this.passwordEncoder = passwordEncoder;
    this.jwtTokenProvider = jwtTokenProvider;
    this.userMapper = userMapper;
  }

  public AuthTokens login(LoginRequest request) {
    User user =
        userRepository
            .findByEmail(request.email())
            .filter(User::isActive)
            .orElseThrow(InvalidCredentialsException::new);

    if (!passwordEncoder.matches(request.password(), user.getPasswordHash())) {
      throw new InvalidCredentialsException();
    }

    return issueTokens(user);
  }

  /**
   * Exchanges a refresh token for a fresh pair. The user is re-read from the database, so a
   * deactivated account or a changed role takes effect here rather than lasting the full refresh
   * lifetime.
   */
  public AuthTokens refresh(String refreshToken) {
    if (!jwtTokenProvider.isValidRefreshToken(refreshToken)) {
      throw new InvalidCredentialsException();
    }

    User user =
        userRepository
            .findByEmail(jwtTokenProvider.getEmailFromRefreshToken(refreshToken))
            .filter(User::isActive)
            .orElseThrow(InvalidCredentialsException::new);

    return issueTokens(user);
  }

  private AuthTokens issueTokens(User user) {
    return new AuthTokens(
        jwtTokenProvider.generateToken(user),
        jwtTokenProvider.generateRefreshToken(user),
        userMapper.toDto(user));
  }

  public UserDto getMe(String email) {
    User user = userRepository.findByEmail(email).orElseThrow(InvalidCredentialsException::new);
    return userMapper.toDto(user);
  }
}
