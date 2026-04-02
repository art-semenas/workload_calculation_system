package com.workload.service;

import com.workload.dto.LoginRequest;
import com.workload.dto.LoginResponse;
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

  public LoginResponse login(LoginRequest request) {
    User user =
        userRepository
            .findByEmail(request.email())
            .filter(User::isActive)
            .orElseThrow(InvalidCredentialsException::new);

    if (!passwordEncoder.matches(request.password(), user.getPasswordHash())) {
      throw new InvalidCredentialsException();
    }

    String token = jwtTokenProvider.generateToken(user);
    UserDto userDto = userMapper.toDto(user);
    return new LoginResponse(token, userDto);
  }

  public UserDto getMe(String email) {
    User user =
        userRepository
            .findByEmail(email)
            .orElseThrow(InvalidCredentialsException::new);
    return userMapper.toDto(user);
  }
}
