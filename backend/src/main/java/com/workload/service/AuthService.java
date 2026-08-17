package com.workload.service;

import com.workload.dto.AuthTokens;
import com.workload.dto.LoginRequest;
import com.workload.dto.UserDto;
import com.workload.entity.User;
import com.workload.exception.AccountLockedException;
import com.workload.exception.InvalidCredentialsException;
import com.workload.mapper.UserMapper;
import com.workload.repository.UserRepository;
import com.workload.security.JwtTokenProvider;
import java.time.OffsetDateTime;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Slf4j
public class AuthService {

  private final UserRepository userRepository;
  private final PasswordEncoder passwordEncoder;
  private final JwtTokenProvider jwtTokenProvider;
  private final UserMapper userMapper;
  private final int maxFailedAttempts;
  private final int lockoutDurationMinutes;

  public AuthService(
      UserRepository userRepository,
      PasswordEncoder passwordEncoder,
      JwtTokenProvider jwtTokenProvider,
      UserMapper userMapper,
      @Value("${security.lockout.max-attempts}") int maxFailedAttempts,
      @Value("${security.lockout.duration-minutes}") int lockoutDurationMinutes) {
    this.userRepository = userRepository;
    this.passwordEncoder = passwordEncoder;
    this.jwtTokenProvider = jwtTokenProvider;
    this.userMapper = userMapper;
    this.maxFailedAttempts = maxFailedAttempts;
    this.lockoutDurationMinutes = lockoutDurationMinutes;
  }

  // The failed-attempt counter must survive the exception that reports the failure, otherwise the
  // rollback undoes every increment and the account never locks.
  @Transactional(noRollbackFor = InvalidCredentialsException.class)
  public AuthTokens login(LoginRequest request) {
    User user =
        userRepository
            .findByEmail(request.email())
            .filter(User::isActive)
            .orElseThrow(InvalidCredentialsException::new);

    if (isLocked(user)) {
      throw new AccountLockedException(user.getLockedUntil());
    }

    // Lock has expired: clear it and restore a full set of attempts, rather than leaving the
    // counter at the threshold where a single wrong password would immediately re-lock.
    if (user.getLockedUntil() != null) {
      user.setLockedUntil(null);
      user.setFailedLoginCount(0);
    }

    if (!passwordEncoder.matches(request.password(), user.getPasswordHash())) {
      registerFailedAttempt(user);
      throw new InvalidCredentialsException();
    }

    user.setFailedLoginCount(0);
    user.setLockedUntil(null);
    userRepository.save(user);

    return issueTokens(user);
  }

  private boolean isLocked(User user) {
    return user.getLockedUntil() != null && user.getLockedUntil().isAfter(OffsetDateTime.now());
  }

  private void registerFailedAttempt(User user) {
    user.setFailedLoginCount(user.getFailedLoginCount() + 1);
    if (user.getFailedLoginCount() >= maxFailedAttempts) {
      user.setLockedUntil(OffsetDateTime.now().plusMinutes(lockoutDurationMinutes));
      log.warn(
          "Account locked after {} failed attempts: userId={}",
          user.getFailedLoginCount(),
          user.getId());
    }
    userRepository.save(user);
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
            .findByEmail(jwtTokenProvider.getEmail(refreshToken))
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
