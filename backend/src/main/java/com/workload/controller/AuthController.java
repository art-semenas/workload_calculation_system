package com.workload.controller;

import com.workload.dto.ApiResponse;
import com.workload.dto.LoginRequest;
import com.workload.dto.LoginResponse;
import com.workload.dto.UserDto;
import com.workload.entity.User;
import com.workload.exception.InvalidCredentialsException;
import com.workload.mapper.UserMapper;
import com.workload.repository.UserRepository;
import com.workload.security.JwtTokenProvider;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

  private final UserRepository userRepository;
  private final PasswordEncoder passwordEncoder;
  private final JwtTokenProvider jwtTokenProvider;
  private final UserMapper userMapper;

  public AuthController(
      UserRepository userRepository,
      PasswordEncoder passwordEncoder,
      JwtTokenProvider jwtTokenProvider,
      UserMapper userMapper) {
    this.userRepository = userRepository;
    this.passwordEncoder = passwordEncoder;
    this.jwtTokenProvider = jwtTokenProvider;
    this.userMapper = userMapper;
  }

  @PostMapping("/login")
  public ResponseEntity<ApiResponse<LoginResponse>> login(
      @Valid @RequestBody LoginRequest request) {
    User user =
        userRepository
            .findByEmail(request.email())
            .filter(u -> u.isActive())
            .orElseThrow(InvalidCredentialsException::new);

    if (!passwordEncoder.matches(request.password(), user.getPasswordHash())) {
      throw new InvalidCredentialsException();
    }

    String token = jwtTokenProvider.generateToken(user);
    UserDto userDto = userMapper.toDto(user);
    return ResponseEntity.ok(ApiResponse.success(new LoginResponse(token, userDto)));
  }

  @PostMapping("/logout")
  public ResponseEntity<Void> logout() {
    return ResponseEntity.noContent().build();
  }

  @GetMapping("/me")
  public ResponseEntity<ApiResponse<UserDto>> me(@AuthenticationPrincipal UserDetails userDetails) {
    User user =
        userRepository
            .findByEmail(userDetails.getUsername())
            .orElseThrow(InvalidCredentialsException::new);
    return ResponseEntity.ok(ApiResponse.success(userMapper.toDto(user)));
  }
}
