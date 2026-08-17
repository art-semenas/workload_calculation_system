package com.workload.controller;

import com.workload.dto.ApiResponse;
import com.workload.dto.AuthTokens;
import com.workload.dto.LoginRequest;
import com.workload.dto.LoginResponse;
import com.workload.dto.UserDto;
import com.workload.exception.InvalidCredentialsException;
import com.workload.service.AuthService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

  static final String REFRESH_COOKIE = "refresh_token";

  /** Scoped to the auth endpoints so the cookie is not attached to every API call. */
  private static final String REFRESH_COOKIE_PATH = "/api/v1/auth";

  private final AuthService authService;
  private final long refreshMaxAgeSeconds;
  private final boolean refreshCookieSecure;

  public AuthController(
      AuthService authService,
      @Value("${jwt.refresh-expiration-ms}") long refreshExpirationMs,
      @Value("${jwt.refresh-cookie-secure}") boolean refreshCookieSecure) {
    this.authService = authService;
    this.refreshMaxAgeSeconds = refreshExpirationMs / 1000;
    this.refreshCookieSecure = refreshCookieSecure;
  }

  @PostMapping("/login")
  public ResponseEntity<ApiResponse<LoginResponse>> login(
      @Valid @RequestBody LoginRequest request) {
    return respondWithTokens(authService.login(request));
  }

  /**
   * Exchanges the refresh cookie for a new token pair. Permitted without an access token — by the
   * time this is called the access token has usually expired.
   */
  @PostMapping("/refresh")
  public ResponseEntity<ApiResponse<LoginResponse>> refresh(
      @CookieValue(name = REFRESH_COOKIE, required = false) String refreshToken) {
    if (refreshToken == null || refreshToken.isBlank()) {
      throw new InvalidCredentialsException();
    }
    return respondWithTokens(authService.refresh(refreshToken));
  }

  @PostMapping("/logout")
  public ResponseEntity<Void> logout() {
    return ResponseEntity.noContent()
        .header(HttpHeaders.SET_COOKIE, refreshCookie("", 0).toString())
        .build();
  }

  @GetMapping("/me")
  public ResponseEntity<ApiResponse<UserDto>> me(@AuthenticationPrincipal UserDetails userDetails) {
    return ResponseEntity.ok(ApiResponse.success(authService.getMe(userDetails.getUsername())));
  }

  private ResponseEntity<ApiResponse<LoginResponse>> respondWithTokens(AuthTokens tokens) {
    return ResponseEntity.ok()
        .header(
            HttpHeaders.SET_COOKIE,
            refreshCookie(tokens.refreshToken(), refreshMaxAgeSeconds).toString())
        .body(ApiResponse.success(new LoginResponse(tokens.accessToken(), tokens.user())));
  }

  private ResponseCookie refreshCookie(String value, long maxAgeSeconds) {
    return ResponseCookie.from(REFRESH_COOKIE, value)
        .httpOnly(true)
        .secure(refreshCookieSecure)
        .sameSite("Strict")
        .path(REFRESH_COOKIE_PATH)
        .maxAge(maxAgeSeconds)
        .build();
  }
}
